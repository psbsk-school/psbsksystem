/**
 * Google Drive layer: เก็บไฟล์แนบของงาน
 * สร้างโฟลเดอร์อัตโนมัติครั้งแรกที่ใช้ และเก็บ id ไว้ใน Script Properties
 */

function getFolder_() {
  const props = PropertiesService.getScriptProperties();
  let id = props.getProperty('DRIVE_FOLDER_ID');
  let folder = null;

  if (id) {
    try {
      folder = DriveApp.getFolderById(id);
    } catch (err) {
      id = null;
    }
  }

  if (!id) {
    folder = DriveApp.createFolder(APP.FOLDER_NAME);
    id = folder.getId();
    props.setProperty('DRIVE_FOLDER_ID', id);
  }

  return folder;
}

function uploadAttachment_(data) {
  if (!data || !data.name || !data.base64) {
    throw new Error('ต้องระบุ name และ base64 ของไฟล์');
  }

  const safeName = String(data.name).replace(/[\\/:*?"<>|]/g, '_');
  const bytes = Utilities.base64Decode(String(data.base64));
  const blob = Utilities.newBlob(bytes, data.mimeType || 'application/octet-stream', safeName);
  const file = getFolder_().createFile(blob);

  // ให้ลิงก์เปิดได้จากหน้าเว็บที่เป็น public
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  return {
    id: file.getId(),
    name: file.getName(),
    url: file.getUrl()
  };
}

function deleteAttachment_(data) {
  if (!data || !data.id) throw new Error('ต้องระบุ id ของไฟล์');
  try {
    DriveApp.getFileById(data.id).setTrashed(true);
    return true;
  } catch (err) {
    return false;
  }
}
