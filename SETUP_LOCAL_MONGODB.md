# Setup MongoDB Lokal - Quick Guide

## Install MongoDB (Windows)

### Method 1: Download & Install

1. **Download:**
   - https://www.mongodb.com/try/download/community
   - Pilih: Windows, MSI, Latest version

2. **Install:**
   - Run installer
   - Pilih "Complete"
   - ✅ Centang "Install MongoDB as a Service"
   - ✅ Centang "Install MongoDB Compass" (optional)

3. **Verify:**
   ```powershell
   mongosh
   ```
   Jika muncul MongoDB shell, berarti berhasil!

### Method 2: Via Chocolatey (Jika sudah install)
```powershell
choco install mongodb
```

## Start MongoDB

```powershell
# Buka PowerShell sebagai Admin
Start-Service MongoDB
```

## Test Connection

```powershell
# Test MongoDB
mongosh

# Atau test dari aplikasi
cd backend
npm run check-db
```

## Setup .env

Edit `backend/.env`:
```env
MONGODB_URI=mongodb://localhost:27017/sekolahkita
JWT_SECRET=your-secret-key-minimum-32-characters
```

## Fix Security Vulnerability

```powershell
cd "C:\Users\User\Documents\PROJECT SEKOLAH\frontend"
npm audit fix
```

Jika masih ada:
```powershell
npm audit fix --force
```

## Start Application

```powershell
cd "C:\Users\User\Documents\PROJECT SEKOLAH"
npm run dev
```

## Troubleshooting

**MongoDB tidak start:**
```powershell
# Check service
Get-Service MongoDB

# Start service (Admin)
Start-Service MongoDB
```

**Port 27017 terpakai:**
```powershell
netstat -ano | findstr :27017
taskkill /PID <PID> /F
```

## Next Steps

1. ✅ Install MongoDB
2. ✅ Start MongoDB service
3. ✅ Test connection: `npm run check-db`
4. ✅ Seed database: `npm run seed`
5. ✅ Start app: `npm run dev`
6. ✅ Login: http://localhost:3000

Lihat `LOCAL_SETUP.md` untuk panduan lengkap.


