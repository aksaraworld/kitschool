# Panduan Preview Aksara School Management

## Prerequisites
Sebelum menjalankan aplikasi, pastikan sudah terinstall:
- **Node.js** 18+ dan npm
- **MongoDB** (local atau MongoDB Atlas)
- **Git** (optional)

## Langkah 1: Install Dependencies

```bash
# Install semua dependencies (root, frontend, dan backend)
npm run install:all
```

Ini akan menginstall dependencies untuk:
- Root package (concurrently)
- Frontend (Next.js)
- Backend (Express)

## Langkah 2: Setup MongoDB

### Opsi A: MongoDB Local
1. Pastikan MongoDB sudah terinstall dan berjalan
2. MongoDB biasanya berjalan di `mongodb://localhost:27017`

### Opsi B: MongoDB Atlas (Cloud)
1. Buat account di [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Buat cluster baru (gratis)
3. Dapatkan connection string
4. Update `MONGODB_URI` di `backend/.env`

## Langkah 3: Setup Environment Variables

### Backend
1. Copy file `.env.example` ke `.env`:
```bash
cd backend
cp .env.example .env
```

2. Edit file `backend/.env`:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/sekolahkita
JWT_SECRET=your-secret-key-change-in-production-minimum-32-characters
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:3000
```

**Catatan**: Ganti `MONGODB_URI` jika menggunakan MongoDB Atlas:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/sekolahkita
```

### Frontend
1. Copy file `.env.local.example` ke `.env.local`:
```bash
cd frontend
cp .env.local.example .env.local
```

2. Edit file `frontend/.env.local` (optional, sudah default):
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

## Langkah 4: Seed Database (Optional)

Untuk membuat user admin awal:

```bash
# Dari root directory
npm run seed
```

Ini akan membuat:
- **Email**: `admin@school.com`
- **Password**: `admin123`
- **Role**: Principal
- Sample Year, Majors

**PENTING**: Ganti password setelah login pertama kali!

## Langkah 5: Jalankan Aplikasi

### Opsi A: Jalankan Bersamaan (Recommended)
```bash
# Dari root directory
npm run dev
```

Ini akan menjalankan:
- Backend di `http://localhost:5000`
- Frontend di `http://localhost:3000`

### Opsi B: Jalankan Terpisah

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

## Langkah 6: Akses Aplikasi

1. Buka browser dan akses: `http://localhost:3000`
2. Login dengan credentials:
   - **Email**: `admin@school.com`
   - **Password**: `admin123`

## Troubleshooting

### Error: MongoDB connection failed
- Pastikan MongoDB berjalan (local) atau connection string benar (Atlas)
- Check firewall settings untuk MongoDB Atlas
- Pastikan IP whitelist sudah di-set di MongoDB Atlas

### Error: Port already in use
- Backend: Ganti `PORT` di `backend/.env`
- Frontend: Stop process yang menggunakan port 3000, atau edit `frontend/package.json`

### Error: Module not found
```bash
# Reinstall dependencies
rm -rf node_modules frontend/node_modules backend/node_modules
npm run install:all
```

### Error: JWT secret too short
- Pastikan `JWT_SECRET` di `backend/.env` minimal 32 karakter

### Frontend tidak connect ke backend
- Check `NEXT_PUBLIC_API_URL` di `frontend/.env.local`
- Pastikan backend berjalan di port yang benar
- Check CORS settings di backend

## Testing dengan User Berbeda

Setelah login sebagai admin, buat user baru:

1. Login sebagai Principal/Staff
2. Pergi ke menu **Pengguna** → **Buat User**
3. Buat user dengan role:
   - **Student**: Siswa
   - **Parent**: Orang Tua
   - **Teacher**: Guru
   - **Staff**: Staf
   - **Finance**: Keuangan

## Fitur yang Bisa Ditest

### Sebagai Principal/Staff:
- ✅ Buat user baru
- ✅ Buat tahun ajaran
- ✅ Buat jurusan
- ✅ Buat kelas
- ✅ Assign siswa ke kelas
- ✅ Edit profil sekolah
- ✅ Buat invoice

### Sebagai Parent:
- ✅ Lihat anak-anak
- ✅ Lihat tagihan
- ✅ Bayar tagihan (payment attempt)
- ✅ Lihat kehadiran anak
- ✅ Lihat kalender
- ✅ Kirim pesan ke guru

### Sebagai Student:
- ✅ Submit kehadiran
- ✅ Lihat kalender
- ✅ Lihat laporan

### Sebagai Teacher:
- ✅ Submit kehadiran sendiri
- ✅ Lihat kelas yang diampu
- ✅ Buat jadwal
- ✅ Kirim pesan ke orang tua

### Sebagai Finance:
- ✅ Lihat semua invoice
- ✅ Verifikasi payment attempts
- ✅ Update status pembayaran

## Development Tips

### Hot Reload
- Frontend: Auto reload saat edit file
- Backend: Auto restart saat edit file (menggunakan tsx watch)

### Database GUI (Optional)
Gunakan tools berikut untuk melihat database:
- **MongoDB Compass** (Desktop GUI)
- **Studio 3T** (Desktop GUI)
- **MongoDB Atlas UI** (Web GUI)

### API Testing
Test API langsung dengan:
- **Postman**
- **Thunder Client** (VS Code extension)
- **curl** commands

### Logs
- Backend logs: Lihat di terminal backend
- Frontend logs: Lihat di browser console (F12)

## Production Build

Untuk build production:

```bash
# Build frontend
cd frontend
npm run build
npm start

# Build backend
cd backend
npm run build
npm start
```

## Next Steps

Setelah aplikasi berjalan:
1. ✅ Buat tahun ajaran pertama
2. ✅ Buat jurusan
3. ✅ Buat kelas
4. ✅ Buat user siswa dan orang tua
5. ✅ Assign siswa ke kelas
6. ✅ Buat invoice untuk testing
7. ✅ Test flow pembayaran

## Support

Jika ada masalah:
1. Check error messages di terminal
2. Check browser console (F12)
3. Check MongoDB connection
4. Verify environment variables
5. Check port availability

Happy coding! 🚀

