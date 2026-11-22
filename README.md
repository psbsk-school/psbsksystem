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
- ✅ สร้าง Web App deployment แบบ `ANYONE_ANONYMOUS` + `USER_DEPLOYING`
- ✅ ใส่ Web App URL ลงใน `config.js` แล้ว
- ✅ ตั้งค่า GitHub Actions workflow สำหรับ GitHub Pages

## ขั้นตอนที่ต้องทำเพิ่ม (one-time)

### 1. อนุญาตสิทธิ์ Apps Script (สำคัญ)

Apps Script จะสร้าง Google Sheet (`Task Manager DB`) และโฟลเดอร์ Drive (`Task Manager Attachments`) เองอัตโนมัติตอนเรียกครั้งแรก แต่ owner ต้องกดอนุญาต scopes ก่อน:

1. เปิด <https://script.google.com/d/182Y_FwtfBbrIXzwF8mjN5ke_vLqAKGwlaI03mxq017i0mXKjihUlK4Yw/edit> (ล็อกอินด้วยบัญชีที่ใช้ `clasp`)
2. เลือกฟังก์ชัน `doGet` ในแถบToolbar แล้วกด **Run** → กด **Review permissions** → เลือกบัญชี → **Advanced → Go to Task Manager API (unsafe)** → **Allow**
3. ทดสอบ Web App URL ที่ <https://script.google.com/macros/s/AKfycbzoD4jbOn-0vr6IWrMKiIjWdIEiB1-XQe7YNUG3vdX_6bYoARxyBbNcKmHWH05lS6dd/exec> ต้องเห็น JSON `{"ok":true,...}`

> ถ้าเจอ 403 / ไม่พบสิทธิ์ แสดงว่ายังไม่ได้กด Allow ในขั้นตอนที่ 2

### 2. สร้าง GitHub repo และตั้งค่า Pages

1. สร้าง repository ใหม่บน GitHub (เช่น `task-manager`)
2. ในโฟลเดอร์นี้รัน:

```powershell
git init
git remote add origin https://github.com/<USERNAME>/<REPO>.git
git add -A
git commit -m "Initial commit"
git branch -M main
git push -u origin main
```

3. ที่ repo → **Settings → Pages → Build and deployment** เลือก **Source: GitHub Actions** (workflow ที่มีอยู่จะ deploy เองทุกครั้งที่ push เข้า `main`)

### 3. ใช้งาน/อัปเดต

```powershell
npm install                              # ครั้งแรก
npm run push:all "คำอธิบายการเปลี่ยนแปลง"  # push GitHub + clasp push + deploy ใหม่
npm run push:github "message"            # push เฉพาะ GitHub
npm run push:apps-script "message"       # push + deploy เฉพาะ Apps Script
```

เมื่อแก้ `code.gs` / `sheets.gs` / `drive.gs` ต้องรัน `clasp push` แล้ว **Deploy > Manage deployments → Edit → Version: New version** หรือใช้ `npm run push:apps-script` ที่ทำให้ใหม่ให้

## ความปลอดภัย

Web App ถูก deploy แบบ **ทุกคน (ANYONE_ANONYMOUS)** และ script รันในนามเจ้าของ (`USER_DEPLOYING`) ใครได้ URL ก็เรียก API ได้ เพื่อป้องกัน:

- ใส่โทเค็นใน `APP.API_TOKEN` ใน `code.gs` และใส่ค่าเดียวกันใน `config.js` → `API_TOKEN` แล้ว push ใหม่ทั้ง 2 ฝั่ง
- หรือเปลี่ยน deployment access เป็น **Anyone with Google account** / **Only myself** ใน Apps Script หากไม่ต้องการให้สาธารณะ

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
