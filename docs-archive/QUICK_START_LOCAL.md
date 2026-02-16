# Quick Start - Setup Lokal

## ✅ Step 1: Install MongoDB

### Windows:
1. Download: https://www.mongodb.com/try/download/community
2. Install dengan default settings
3. ✅ Centang "Install MongoDB as a Service"

### Start MongoDB:
```powershell
# Buka PowerShell sebagai Admin
Start-Service MongoDB
```

### Test:
```powershell
mongosh
# Jika berhasil, ketik 'exit' untuk keluar
```

## ✅ Step 2: Setup Environment

Edit `backend/.env`:
```env
MONGODB_URI=mongodb://localhost:27017/sekolahkita
JWT_SECRET=your-secret-key-minimum-32-characters-long
```

## ✅ Step 3: Fix Security (Sudah dilakukan)

Next.js sudah diupdate ke versi terbaru untuk fix vulnerability.

## ✅ Step 4: Test MongoDB Connection

```powershell
cd backend
npm run check-db
```

Harus muncul:
```
✅ MongoDB connected successfully!
```

## ✅ Step 5: Seed Database

```powershell
# Dari root directory
npm run seed
```

## ✅ Step 6: Start Application

```powershell
# Dari root directory
npm run dev
```

## ✅ Step 7: Login

1. Buka: http://localhost:3000
2. Login: `admin@school.com` / `admin123`

## 🎉 Done!

Sekarang aplikasi berjalan dengan MongoDB lokal!

## Troubleshooting

**MongoDB tidak start:**
```powershell
Get-Service MongoDB
Start-Service MongoDB
```

**Connection error:**
- Pastikan MongoDB service running
- Check `MONGODB_URI` di `.env`
- Test dengan `mongosh`

Lihat `LOCAL_SETUP.md` untuk detail lengkap.


