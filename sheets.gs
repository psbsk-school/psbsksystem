/**
 * Google Sheets layer
 * Script แบบ standalone จะสร้าง Spreadsheet เองอัตโนมัติครั้งแรกที่เรียกใช้
 * และเก็บ id ไว้ใน Script Properties (ไม่ต้องกรอก id เอง)
 */

function getSpreadsheet_() {
  const props = PropertiesService.getScriptProperties();
  let id = props.getProperty('SPREADSHEET_ID');
  let ss = null;

  if (id) {
    try {
      ss = SpreadsheetApp.openById(id);
    } catch (err) {
      id = null;
    }
  }

  if (!id) {
    ss = SpreadsheetApp.create('Task Manager DB');
    id = ss.getId();
    props.setProperty('SPREADSHEET_ID', id);

    const sheet = ss.getSheets()[0];
    sheet.setName(APP.SHEET_NAME);
    formatHeader_(sheet);
  }

  return ss;
}

function getTaskSheet_() {
  const ss = getSpreadsheet_();
  let sheet = ss.getSheetByName(APP.SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(APP.SHEET_NAME);
    formatHeader_(sheet);
  }
  return sheet;
}

function formatHeader_(sheet) {
  sheet.clear();
  sheet.appendRow(APP.HEADERS);
  sheet.setFrozenRows(1);
  const header = sheet.getRange(1, 1, 1, APP.HEADERS.length);
  header.setFontWeight('bold').setBackground('#1f2937').setFontColor('#ffffff');
  sheet.setColumnWidth(1, 140);
  sheet.setColumnWidth(2, 260);
  sheet.setColumnWidth(3, 320);
  sheet.setColumnWidth(4, 110);
  sheet.setColumnWidth(5, 110);
  sheet.setColumnWidth(6, 140);
  sheet.setColumnWidth(7, 200);
  sheet.setColumnWidth(8, 200);
  sheet.setColumnWidth(9, 200);
  sheet.setColumnWidth(10, 320);
}

function readRows_() {
  const sheet = getTaskSheet_();
  const last = sheet.getLastRow();
  if (last < 2) return [];

  const values = sheet.getRange(2, 1, last - 1, APP.HEADERS.length).getValues();
  return values.map(function (row, index) {
    const item = { _row: index + 2 };
    APP.HEADERS.forEach(function (name, col) {
      item[name] = row[col];
    });
    return item;
  });
}

function toPublicTask_(row) {
  const task = {};
  APP.HEADERS.forEach(function (name) {
    task[name] = row[name];
  });
  return task;
}

function listTasks_() {
  return readRows_()
    .sort(function (a, b) {
      return String(b.createdAt).localeCompare(String(a.createdAt));
    })
    .map(toPublicTask_);
}

function findTask_(id) {
  return readRows_().find(function (row) {
    return String(row.id) === String(id);
  });
}

function addTask_(data) {
  if (!data || !String(data.title || '').trim()) {
    throw new Error('กรุณากรอกชื่องาน');
  }

  const now = new Date().toISOString();
  const task = {
    id: Utilities.getUuid(),
    title: String(data.title).trim(),
    description: String(data.description || ''),
    status: data.status || 'todo',
    priority: data.priority || 'normal',
    dueDate: data.dueDate || '',
    createdAt: now,
    updatedAt: now,
    attachmentName: data.attachmentName || '',
    attachmentUrl: data.attachmentUrl || ''
  };

  getTaskSheet_().appendRow(APP.HEADERS.map(function (name) {
    return task[name];
  }));
  return task;
}

function updateTask_(data) {
  if (!data || !data.id) throw new Error('ต้องระบุ id');
  const target = findTask_(data.id);
  if (!target) throw new Error('ไม่พบงานนี้ใน Sheet');

  const editable = [
    'title', 'description', 'status', 'priority', 'dueDate',
    'attachmentName', 'attachmentUrl'
  ];
  const values = APP.HEADERS.map(function (name) {
    return target[name];
  });

  editable.forEach(function (name) {
    if (Object.prototype.hasOwnProperty.call(data, name)) {
      values[APP.HEADERS.indexOf(name)] = data[name];
    }
  });
  values[APP.HEADERS.indexOf('updatedAt')] = new Date().toISOString();

  getTaskSheet_().getRange(target._row, 1, 1, APP.HEADERS.length).setValues([values]);
  return toPublicTask_(Object.assign({}, target, values.reduce(function (acc, value, index) {
    acc[APP.HEADERS[index]] = value;
    return acc;
  }, {})));
}

function deleteTask_(data) {
  if (!data || !data.id) throw new Error('ต้องระบุ id');
  const target = findTask_(data.id);
  if (!target) return false;
  getTaskSheet_().deleteRow(target._row);
  return true;
}
