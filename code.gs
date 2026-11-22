/**
 * Task Manager API
 * Web App entry point: รับคำขอจากหน้าเว็บ (GitHub Pages) แล้วส่งต่อไปยัง Sheets / Drive
 */

const APP = {
  SHEET_NAME: 'Tasks',
  FOLDER_NAME: 'Task Manager Attachments',
  // ถ้าต้องการป้องกันคนอื่นเรียก API ให้ใส่โทเค็นลงที่นี่ และใส่ค่าเดิมใน config.js ด้วย
  API_TOKEN: '',
  HEADERS: [
    'id', 'title', 'description', 'status', 'priority', 'dueDate',
    'createdAt', 'updatedAt', 'attachmentName', 'attachmentUrl'
  ]
};

/** GET: ใช้สำหรับ health check และ JSONP fallback (?callback=...) */
function doGet(e) {
  const params = (e && e.parameter) || {};
  const result = route_((params.action || 'health'), params, {});

  if (params.callback) {
    return ContentService
      .createTextOutput(String(params.callback) + '(' + JSON.stringify(result) + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return outputJson_(result);
}

/** POST: หน้าเว็บส่ง JSON มาใน body (Content-Type: text/plain เพื่อเลี่ยง CORS preflight) */
function doPost(e) {
  let body = {};
  try {
    const raw = e && e.postData && e.postData.contents;
    if (raw) body = JSON.parse(raw);
  } catch (err) {
    return outputJson_(fail('JSON body ไม่ถูกต้อง: ' + err.message));
  }

  const params = (e && e.parameter) || {};
  const action = params.action || body.action || 'health';
  return outputJson_(route_(action, params, body));
}

/** เผื่อ browser ส่ง preflight (โดยปกติไม่เกิดขึ้นเพราะใช้ text/plain) */
function doOptions() {
  return ContentService.createTextOutput('').setMimeType(ContentService.MimeType.TEXT);
}

function outputJson_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function ok(data) {
  return Object.assign({ ok: true }, data || {});
}

function fail(message) {
  return { ok: false, error: String(message) };
}

function authorize_(params, body) {
  if (!APP.API_TOKEN) return null;
  const token = (body && body.token) || params.token;
  return token === APP.API_TOKEN ? null : fail('API token ไม่ถูกต้อง');
}

function route_(action, params, body) {
  const authError = authorize_(params, body);
  if (authError) return authError;

  try {
    switch (action) {
      case 'health':
      case 'info':
        return ok({
          service: 'Task Manager API',
          time: new Date().toISOString(),
          spreadsheetUrl: getSpreadsheet_().getUrl(),
          folderUrl: getFolder_().getUrl()
        });
      case 'list':
        return ok({ tasks: listTasks_() });
      case 'add':
        return ok({ task: addTask_(body) });
      case 'update':
        return ok({ task: updateTask_(body) });
      case 'delete':
        return ok({ deleted: deleteTask_(body) });
      case 'upload':
        return ok({ attachment: uploadAttachment_(body) });
      case 'deleteFile':
        return ok({ deleted: deleteAttachment_(body) });
      default:
        return fail('ไม่พบ action: ' + action);
    }
  } catch (err) {
    return fail(err && err.message ? err.message : String(err));
  }
}
