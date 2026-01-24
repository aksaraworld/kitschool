# Quick Start - Cognifa

## 🚀 Jalankan dalam 5 Menit

### 1. Install Dependencies
```bash
npm run install:all
```

### 2. Setup MongoDB
**Opsi A - Local:**
```bash
# Pastikan MongoDB sudah terinstall dan berjalan
mongod
```

**Opsi B - MongoDB Atlas (Cloud):**
1. Buat account di [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Buat cluster gratis
3. Dapatkan connection string

### 3. Setup Environment

**Backend:**
```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:
```env
MONGODB_URI=mongodb://localhost:27017/sekolahkita
# atau
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/sekolahkita

JWT_SECRET=your-secret-key-minimum-32-characters-long
```

**Frontend (optional):**
```bash
cd frontend
cp .env.local.example .env.local
```

### 4. Seed Database
```bash
npm run seed
```

Ini membuat admin user:
- Email: `admin@school.com`
- Password: `admin123`

### 5. Run Application
```bash
npm run dev
```

### 6. Login
1. Buka: http://localhost:3000
2. Login dengan: `admin@school.com` / `admin123`

## ✅ Done!

Sekarang Anda bisa:
- ✅ Buat user baru (Pengguna → Buat User)
- ✅ Buat tahun ajaran, jurusan, kelas
- ✅ Buat invoice untuk testing
- ✅ Test semua fitur

## 📝 Notes

- Backend berjalan di: http://localhost:5000
- Frontend berjalan di: http://localhost:3000
- MongoDB harus berjalan sebelum start aplikasi
- Ganti password admin setelah login pertama!

## 🐛 Troubleshooting

**Error MongoDB connection:**
- Pastikan MongoDB berjalan
- Check `MONGODB_URI` di `.env`

**Error port already in use:**
- Ganti PORT di `backend/.env`
- Stop process di port 3000

**Error module not found:**
```bash
rm -rf node_modules frontend/node_modules backend/node_modules
npm run install:all
```

## 📚 Dokumentasi Lengkap

Lihat [PREVIEW_GUIDE.md](./PREVIEW_GUIDE.md) untuk panduan detail.
