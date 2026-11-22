# Task Manager — GitHub Pages + Google Sheets/Drive

แอปจัดการงานแบบไม่มี server: หน้าเว็บอยู่บน **GitHub Pages** ส่วน backend ใช้ **Google Apps Script Web App** เพื่อเขียน/อ่านข้อมูลใน **Google Sheets** และเก็บไฟล์แนบใน **Google Drive**

## โครงสร้าง

| ไฟล์ | หน้าที่ |
| --- | --- |
| `index.html`, `styles.css`, `app.js`, `config.js` | Frontend (อัปโหลดขึ้น GitHub Pages) |
| `code.gs`, `sheets.gs`, `drive.gs`, `appsscript.json` | Backend (อัปโหลดด้วย `clasp push`) |
| `.clasp.json` | scriptId ของ Apps Script (สร้างโดย `clasp create` แล้ว) |
| `.claspignore` | กันไม่ให้ frontend ถูก push ขึ้น Apps Script |
| `.github/workflows/deploy.yml` | GitHub Actions deploy ขึ้น Pages อัตโนมัติ |
| `scripts/push.js` | สคริปต์ push ทั้ง GitHub + Apps Script |

## สิ่งที่ทำไปแล้ว

- ✅ ติดตั้ง `clasp` (`npm install`)
- ✅ สร้าง Apps Script project ใหม่ (standalone) และผูกกับโฟลเดอร์นี้ผ่าน `.clasp.json`
- ✅ push `code.gs`, `sheets.gs`, `drive.gs`, `appsscript.json` ขึ้น Apps Script
- ✅ สร้าง Web App deployment แบบ `ANYONE` + `USER_ACCESSING` (ผู้ใช้กดอนุญาตสิทธิ์ของตัวเอง)
- ✅ ใส่ Web App URL ลงใน `config.js` แล้ว
- ✅ ตั้งค่า GitHub Actions workflow สำหรับ GitHub Pages

## ขั้นตอนที่ต้องทำเพิ่ม (one-time)

### 1. อนุญาตสิทธิ์ Apps Script (สำคัญ)

Deployment ถูกตั้งให้รันในนาม **ผู้ใช้ที่เข้าใช้งาน** (`USER_ACCESSING`) ดังนั้นบัญชีที่จะใช้งานแอปต้องกดอนุญาต scopes ครั้งแรก:

1. เปิด Web App URL ที่ <https://script.google.com/macros/s/AKfycbxSmMc2QxQcsAmlQJ-WSgcrhhdFepNFZtr9qd85QQFPP_xBR5AfTmXUFQtxnAl2YE3H/exec> ด้วยบัญชี Google ที่จะใช้ (เช่น `ps.bsk@bskschool.ac.th`)
2. กด **Authorize required** / **Review permissions** → เลือกบัญชี → **Advanced → Go to Task Manager API (unsafe)** → **Allow**
3. หน้าเว็บจะแสดง JSON `{"ok":true,...}` แสดงว่าสำเร็จ (script จะสร้าง Google Sheet `Task Manager DB` และโฟลเดอร์ Drive `Task Manager Attachments` ให้เองตอนนี้)

> ถ้าเจอ 403 / ไม่พบสิทธิ์ แสดงว่ายังไม่ได้กด Allow ในขั้นตอนที่ 2 หรือล็อกอินบัญชีผิด

### 2. สร้าง GitHub repo และตั้งค่า Pages

1. repo ที่ใช้: <https://github.com/psbsk-school/psbsksystem> (push ไปแล้วที่ branch `main`)
2. ที่ repo → **Settings → Pages → Build and deployment** เลือก **Source: GitHub Actions** (workflow ที่มีอยู่จะ deploy เองทุกครั้งที่ push เข้า `main`)
3. ถ้า clone ไปเครื่องอื่น ให้รัน `npm install` ก่อน จากนั้น `npm run push:all "message"` จะ push ทั้ง GitHub และ Apps Script

### 3. ใช้งาน/อัปเดต

```powershell
npm install                              # ครั้งแรก
npm run push:all "คำอธิบายการเปลี่ยนแปลง"  # push GitHub + clasp push + deploy ใหม่
npm run push:github "message"            # push เฉพาะ GitHub
npm run push:apps-script "message"       # push + deploy เฉพาะ Apps Script
```

เมื่อแก้ `code.gs` / `sheets.gs` / `drive.gs` ต้องรัน `clasp push` แล้ว **Deploy > Manage deployments → Edit → Version: New version** หรือใช้ `npm run push:apps-script` ที่ทำให้ใหม่ให้

## ความปลอดภัย

Web App ถูก deploy แบบ **anyone with Google account (`ANYONE`) + USER_ACCESSING** แต่ละบัญชีต้องกด Allow สิทธิ์ของตัวเอง และข้อมูล Sheet/Drive จะอยู่ในบัญชีของผู้ใช้คนนั้น เพื่อป้องกันการเรียกใช้จากคนอื่น:

- ใส่โทเค็นใน `APP.API_TOKEN` ใน `code.gs` และใส่ค่าเดียวกันใน `config.js` → `API_TOKEN` แล้ว push ใหม่ทั้ง 2 ฝั่ง
- หรือเปลี่ยน deployment access เป็น **Only myself** ใน Apps Script หากให้ใช้งานเฉพาะบัญชีเดียว

## API actions

| action | คำอธิบาย |
| --- | --- |
| `health` / `info` | ทดสอบการทำงาน + ลิงก์ Sheet/Drive |
| `list` | ดึงงานทั้งหมด |
| `add` | เพิ่มงาน |
| `update` | แก้ไขงาน (ส่ง `id` + field ที่ต้องการ) |
| `delete` | ลบงาน |
| `upload` | อัปโหลดไฟล์แนบ (base64) ไป Drive |

Frontend ส่ง JSON ผ่าน `fetch` แบบ `POST` และใช้ `Content-Type: text/plain` เพื่อเลี่ยง CORS preflight ของ Apps Script
