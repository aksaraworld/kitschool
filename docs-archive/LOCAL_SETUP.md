# Setup Lokal Aksara School Management

## Overview
Setup untuk development lokal dengan MongoDB. Siap untuk migrasi ke Firebase di masa depan.

## Step 1: Install MongoDB Local

### Windows

1. **Download MongoDB:**
   - Buka: https://www.mongodb.com/try/download/community
   - Pilih:
     - Version: Latest (7.0+)
     - Platform: Windows
     - Package: MSI

2. **Install:**
   - Run installer
   - Pilih "Complete" installation
   - **PENTING**: Centang "Install MongoDB as a Service"
   - Centang "Install MongoDB Compass" (optional, GUI tool)

3. **Verify Installation:**
   ```powershell
   # Test MongoDB shell
   mongosh
   ```
   Jika berhasil, akan muncul MongoDB shell prompt.

### Alternative: MongoDB via Chocolatey
```powershell
# Install via Chocolatey (jika sudah install Chocolatey)
choco install mongodb
```

## Step 2: Start MongoDB Service

### Check Service Status
```powershell
# Buka PowerShell sebagai Admin
Get-Service MongoDB
```

### Start Service
```powershell
# Jika stopped, start service
Start-Service MongoDB

# Atau via Command Prompt (Admin)
net start MongoDB
```

### Verify Running
```powershell
# Test connection
mongosh
# atau
mongosh mongodb://localhost:27017
```

Jika berhasil, akan masuk ke MongoDB shell. Ketik `exit` untuk keluar.

## Step 3: Setup Environment

### Backend .env
Edit `backend/.env`:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/sekolahkita
JWT_SECRET=your-secret-key-minimum-32-characters-long-change-this-in-production
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:3000
```

**PENTING**: Ganti `JWT_SECRET` dengan string random minimal 32 karakter!

### Frontend .env.local (Optional)
Edit `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

## Step 4: Fix Security Vulnerability

```powershell
cd frontend
npm audit fix
```

Jika masih ada vulnerability:
```powershell
npm audit fix --force
```

## Step 5: Test MongoDB Connection

```powershell
cd backend
npm run check-db
```

Jika berhasil:
```
✅ MongoDB connection successful!
✅ Database ready to use
```

## Step 6: Seed Database

```powershell
# Dari root directory
npm run seed
```

Ini akan membuat:
- Admin user: `admin@school.com` / `admin123`
- Sample year, majors

## Step 7: Start Application

```powershell
# Dari root directory
npm run dev
```

Ini akan start:
- Backend: http://localhost:5000
- Frontend: http://localhost:3000

## Step 8: Login

1. Buka browser: http://localhost:3000
2. Login dengan:
   - Email: `admin@school.com`
   - Password: `admin123`

## Troubleshooting

### MongoDB Service Tidak Start

**Check service:**
```powershell
Get-Service MongoDB
```

**Start service (Admin):**
```powershell
Start-Service MongoDB
```

**Check logs:**
```
C:\Program Files\MongoDB\Server\7.0\log\mongod.log
```

**Manual start (jika service tidak ada):**
```powershell
# Cari MongoDB installation path
# Biasanya: C:\Program Files\MongoDB\Server\7.0\bin\

# Run MongoDB manually
& "C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe" --dbpath "C:\data\db"
```

### Port 27017 Already in Use

**Check process:**
```powershell
netstat -ano | findstr :27017
```

**Kill process (ganti PID):**
```powershell
taskkill /PID <PID> /F
```

### MongoDB Not Found

**Check installation:**
```powershell
# Check if MongoDB installed
Get-Command mongosh
Get-Command mongod
```

**Add to PATH (jika perlu):**
```
C:\Program Files\MongoDB\Server\7.0\bin
```

### Connection Refused

1. ✅ Pastikan MongoDB service running
2. ✅ Check `MONGODB_URI` di `backend/.env`
3. ✅ Test dengan `mongosh` command
4. ✅ Check firewall settings

## MongoDB Compass (GUI Tool)

MongoDB Compass adalah GUI untuk melihat dan manage database.

1. **Download:** https://www.mongodb.com/try/download/compass
2. **Connect:** `mongodb://localhost:27017`
3. **View Database:** `sekolahkita`

## Database Structure

Setelah seed, database akan memiliki:
- `users` - User accounts
- `years` - Academic years
- `majors` - School majors
- `classes` - Classes
- `invoices` - Invoices
- `paymentattempts` - Payment attempts
- `schools` - School profile
- Dan lainnya...

## Development Workflow

1. **Start MongoDB:**
   ```powershell
   Start-Service MongoDB
   ```

2. **Start App:**
   ```powershell
   npm run dev
   ```

3. **View Database:**
   - MongoDB Compass: `mongodb://localhost:27017`
   - atau `mongosh` command line

4. **Stop MongoDB (jika perlu):**
   ```powershell
   Stop-Service MongoDB
   ```

## Backup Database

```powershell
# Backup
mongodump --db=sekolahkita --out=C:\backup

# Restore
mongorestore --db=sekolahkita C:\backup\sekolahkita
```

## Future: Migration to Firebase

Database structure sudah dirancang untuk mudah migrasi ke Firebase:
- Models menggunakan Mongoose (mirip dengan Firestore structure)
- Schema sudah normalized
- Ready untuk Firestore collections

Lihat `FIREBASE_MIGRATION.md` untuk panduan migrasi (akan dibuat nanti).

## Quick Commands

```powershell
# Start MongoDB
Start-Service MongoDB

# Stop MongoDB
Stop-Service MongoDB

# Check MongoDB status
Get-Service MongoDB

# Test connection
mongosh

# Test from app
cd backend
npm run check-db

# Seed database
npm run seed

# Start app
npm run dev
```

## Next Steps

Setelah setup berhasil:
1. ✅ Buat tahun ajaran pertama
2. ✅ Buat jurusan
3. ✅ Buat kelas
4. ✅ Buat user siswa dan orang tua
5. ✅ Test semua fitur

Happy coding! 🚀

