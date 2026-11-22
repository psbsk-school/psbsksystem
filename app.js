/** Task Manager frontend — เรียก Apps Script Web App ผ่าน fetch */

const CFG = window.APP_CONFIG || {};
const SCRIPT_URL = CFG.SCRIPT_URL || '';
const TOKEN = CFG.API_TOKEN || '';

const state = {
  tasks: [],
  filter: 'all',
  editingId: null,
  pendingAttachment: null
};

const els = {
  form: document.getElementById('taskForm'),
  formTitle: document.getElementById('formTitle'),
  title: document.getElementById('title'),
  description: document.getElementById('description'),
  priority: document.getElementById('priority'),
  dueDate: document.getElementById('dueDate'),
  attachment: document.getElementById('attachment'),
  submitBtn: document.getElementById('submitBtn'),
  cancelBtn: document.getElementById('cancelBtn'),
  list: document.getElementById('taskList'),
  count: document.getElementById('count'),
  notice: document.getElementById('notice'),
  refreshBtn: document.getElementById('refreshBtn'),
  sheetLink: document.getElementById('sheetLink'),
  driveLink: document.getElementById('driveLink')
};

function escapeHtml(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
  });
}

function showNotice(message, type) {
  els.notice.textContent = message;
  els.notice.className = 'notice' + (type ? ' ' + type : '');
  els.notice.hidden = false;
  if (type !== 'error') {
    window.setTimeout(function () { els.notice.hidden = true; }, 4000);
  }
}

async function api(action, payload) {
  if (!SCRIPT_URL || SCRIPT_URL.indexOf('PASTE_YOUR') === 0) {
    throw new Error('กรุณาใส่ Web App URL ใน config.js ก่อนใช้งาน');
  }

  const response = await fetch(SCRIPT_URL, {
    method: 'POST',
    // text/plain = simple request -> ไม่ต้องส่ง OPTIONS preflight ข้ามโดเมน
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(Object.assign({ action: action, token: TOKEN }, payload || {}))
  });

  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch (err) {
    throw new Error('Apps Script ตอบกลับมาไม่ใช่ JSON: ' + text.slice(0, 200));
  }
  if (!json.ok) throw new Error(json.error || 'เกิดข้อผิดพลาดที่ Apps Script');
  return json;
}

async function loadTasks() {
  try {
    const result = await api('list');
    state.tasks = result.tasks || [];
    renderTasks();

    const info = await api('info');
    if (info.spreadsheetUrl) {
      els.sheetLink.href = info.spreadsheetUrl;
      els.sheetLink.hidden = false;
    }
    if (info.folderUrl) {
      els.driveLink.href = info.folderUrl;
      els.driveLink.hidden = false;
    }
  } catch (err) {
    showNotice(err.message, 'error');
    els.list.innerHTML = '<p class="empty">โหลดข้อมูลไม่สำเร็จ กรุณาตรวจสอบ Web App URL และการ Deploy</p>';
  }
}

function renderTasks() {
  const tasks = state.tasks.filter(function (task) {
    if (state.filter === 'todo') return task.status !== 'done';
    if (state.filter === 'done') return task.status === 'done';
    return true;
  });

  els.count.textContent = String(tasks.length);
  if (!tasks.length) {
    els.list.innerHTML = '<p class="empty">ยังไม่มีงานในรายการ</p>';
    return;
  }

  els.list.innerHTML = tasks.map(function (task) {
    const isDone = task.status === 'done';
    const date = task.dueDate ? '📅 ' + escapeHtml(task.dueDate) : '';
    const priority = String(task.priority || 'normal');
    return [
      '<article class="task ' + (isDone ? 'done' : '') + '" data-id="' + escapeHtml(task.id) + '">',
      '  <div class="task-title">' + escapeHtml(task.title) + '</div>',
      task.description ? '  <div class="task-desc">' + escapeHtml(task.description) + '</div>' : '',
      '  <div class="task-meta">',
      '    <span class="badge ' + (isDone ? 'done' : 'todo') + '">' + (isDone ? 'เสร็จแล้ว' : 'ยังไม่ทำ') + '</span>',
      '    <span class="badge ' + escapeHtml(priority) + '">' + escapeHtml(priority) + '</span>',
      date ? '    <span>' + date + '</span>' : '',
      '  </div>',
      task.attachmentUrl
        ? '  <a class="attach-link" href="' + escapeHtml(task.attachmentUrl) + '" target="_blank" rel="noopener">📎 ' + escapeHtml(task.attachmentName || 'ไฟล์แนบ') + '</a>'
        : '',
      '  <div class="task-actions">',
      '    <button class="icon-btn" data-action="toggle" type="button">' + (isDone ? '↩ กลับเป็นยังไม่ทำ' : '✓ ทำเสร็จ') + '</button>',
      '    <button class="icon-btn" data-action="edit" type="button">✏️ แก้ไข</button>',
      '    <button class="icon-btn danger" data-action="delete" type="button">🗑 ลบ</button>',
      '  </div>',
      '</article>'
    ].join('\n');
  }).join('\n');
}

function resetForm() {
  state.editingId = null;
  state.pendingAttachment = null;
  els.form.reset();
  els.formTitle.textContent = 'เพิ่มงานใหม่';
  els.submitBtn.textContent = 'เพิ่มงาน';
  els.cancelBtn.hidden = true;
}

function startEdit(task) {
  state.editingId = task.id;
  state.pendingAttachment = {
    name: task.attachmentName || '',
    url: task.attachmentUrl || ''
  };
  els.title.value = task.title || '';
  els.description.value = task.description || '';
  els.priority.value = task.priority || 'normal';
  els.dueDate.value = task.dueDate || '';
  els.attachment.value = '';
  els.formTitle.textContent = 'แก้ไขงาน';
  els.submitBtn.textContent = 'บันทึกการแก้ไข';
  els.cancelBtn.hidden = false;
  els.title.focus();
}

function readFileAsBase64(file) {
  return new Promise(function (resolve, reject) {
    const reader = new FileReader();
    reader.onload = function () {
      resolve(String(reader.result).split(',')[1] || '');
    };
    reader.onerror = function () { reject(new Error('อ่านไฟล์ไม่สำเร็จ')); };
    reader.readAsDataURL(file);
  });
}

async function handleSubmit(event) {
  event.preventDefault();
  els.submitBtn.disabled = true;

  try {
    const payload = {
      title: els.title.value,
      description: els.description.value,
      priority: els.priority.value,
      dueDate: els.dueDate.value
    };

    const file = els.attachment.files && els.attachment.files[0];
    if (file) {
      const base64 = await readFileAsBase64(file);
      const uploaded = await api('upload', {
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        base64: base64
      });
      payload.attachmentName = uploaded.attachment.name;
      payload.attachmentUrl = uploaded.attachment.url;
    } else if (state.pendingAttachment) {
      payload.attachmentName = state.pendingAttachment.name;
      payload.attachmentUrl = state.pendingAttachment.url;
    }

    if (state.editingId) {
      payload.id = state.editingId;
      await api('update', payload);
      showNotice('บันทึกการแก้ไขแล้ว', 'success');
    } else {
      await api('add', payload);
      showNotice('เพิ่มงานแล้ว', 'success');
    }

    resetForm();
    await loadTasks();
  } catch (err) {
    showNotice(err.message, 'error');
  } finally {
    els.submitBtn.disabled = false;
  }
}

async function handleListClick(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const article = button.closest('.task');
  const id = article && article.dataset.id;
  const task = state.tasks.find(function (item) { return String(item.id) === String(id); });
  if (!task) return;

  const action = button.dataset.action;
  try {
    if (action === 'toggle') {
      await api('update', { id: id, status: task.status === 'done' ? 'todo' : 'done' });
      showNotice('อัปเดตสถานะแล้ว', 'success');
    } else if (action === 'edit') {
      startEdit(task);
      return;
    } else if (action === 'delete') {
      if (!window.confirm('ลบงาน "' + task.title + '" หรือไม่?')) return;
      await api('delete', { id: id });
      showNotice('ลบงานแล้ว', 'success');
      if (state.editingId === id) resetForm();
    }
    await loadTasks();
  } catch (err) {
    showNotice(err.message, 'error');
  }
}

els.form.addEventListener('submit', handleSubmit);
els.cancelBtn.addEventListener('click', resetForm);
els.refreshBtn.addEventListener('click', loadTasks);
els.list.addEventListener('click', handleListClick);

document.querySelectorAll('.filter-btn').forEach(function (button) {
  button.addEventListener('click', function () {
    document.querySelectorAll('.filter-btn').forEach(function (item) {
      item.classList.remove('active');
    });
    button.classList.add('active');
    state.filter = button.dataset.filter;
    renderTasks();
  });
});

loadTasks();
