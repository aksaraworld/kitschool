# Fix MongoDB Connection Error

## Error yang Anda Alami
```
MongooseServerSelectionError: connect ECONNREFUSED ::1:27017
```

## Solusi Cepat (Pilih Salah Satu)

### 🚀 Opsi 1: MongoDB Atlas (PALING MUDAH - 5 Menit)

**Tidak perlu install MongoDB lokal!**

1. **Buat Account:**
   - Buka: https://www.mongodb.com/cloud/atlas/register
   - Sign up gratis

2. **Buat Cluster:**
   - Pilih "Build a Database" → "FREE"
   - Pilih region terdekat (Singapore)
   - Klik "Create"

3. **Setup Database User:**
   - Username: `sekolahkita` (atau bebas)
   - Password: buat password kuat
   - **SIMPAN PASSWORD!**
   - Klik "Create Database User"

4. **Setup Network Access:**
   - Klik "Network Access" → "Add IP Address"
   - Pilih "Allow Access from Anywhere" (0.0.0.0/0)
   - Klik "Confirm"

5. **Dapatkan Connection String:**
   - Klik "Database" → "Connect" → "Connect your application"
   - Copy connection string, contoh:
   ```
   mongodb+srv://sekolahkita:PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

6. **Update backend/.env:**
   ```env
   MONGODB_URI=mongodb+srv://sekolahkita:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/sekolahkita?retryWrites=true&w=majority
   ```
   Ganti `YOUR_PASSWORD` dengan password yang dibuat di step 3

7. **Test Connection:**
   ```bash
   cd backend
   npm run check-db
   ```

8. **Restart App:**
   ```bash
   npm run dev
   ```

### 🖥️ Opsi 2: Install MongoDB Local (Windows)

1. **Download MongoDB:**
   - https://www.mongodb.com/try/download/community
   - Pilih: Windows, MSI, Latest version

2. **Install:**
   - Run installer
   - Pilih "Complete" installation
   - **PENTING**: Centang "Install MongoDB as a Service"
   - Centang "Install MongoDB Compass" (GUI tool)

3. **Start MongoDB Service:**
   ```bash
   # Buka Command Prompt sebagai Admin
   net start MongoDB
   ```

4. **Verify:**
   ```bash
   mongosh
   # Jika berhasil, akan masuk ke MongoDB shell
   ```

5. **Update backend/.env:**
   ```env
   MONGODB_URI=mongodb://localhost:27017/sekolahkita
   ```

6. **Test:**
   ```bash
   cd backend
   npm run check-db
   ```

### 🐳 Opsi 3: Docker (Jika Sudah Install Docker)

```bash
# Run MongoDB container
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Verify
docker ps

# Update backend/.env
MONGODB_URI=mongodb://localhost:27017/sekolahkita
```

## Test Connection

Setelah setup, test dengan:

```bash
cd backend
npm run check-db
```

Jika berhasil, akan muncul:
```
✅ MongoDB connection successful!
✅ Database ready to use
```

## Troubleshooting

### MongoDB Service Tidak Start (Windows)
```bash
# Check service
sc query MongoDB

# Start service (Admin CMD)
net start MongoDB

# Jika error, check logs
# C:\Program Files\MongoDB\Server\7.0\log\mongod.log
```

### Port 27017 Terpakai
```bash
# Check process
netstat -ano | findstr :27017

# Kill process (ganti PID)
taskkill /PID <PID> /F
```

### Atlas Connection Error
- ✅ Pastikan IP whitelist sudah di-set (0.0.0.0/0)
- ✅ Pastikan password benar (no spaces)
- ✅ Pastikan connection string lengkap
- ✅ Encode special characters di password jika ada

## Setelah Fix

1. **Test connection:**
   ```bash
   cd backend
   npm run check-db
   ```

2. **Seed database:**
   ```bash
   npm run seed
   ```

3. **Start app:**
   ```bash
   npm run dev
   ```

4. **Login:**
   - http://localhost:3000
   - Email: `admin@school.com`
   - Password: `admin123`

## Rekomendasi

**Untuk Development: Gunakan MongoDB Atlas**
- ✅ Tidak perlu install lokal
- ✅ Gratis (M0 tier)
- ✅ Auto-backup
- ✅ Mudah setup
- ✅ Bisa akses dari mana saja

**Untuk Production:**
- Gunakan MongoDB Atlas (paid tier)
- Atau self-hosted dengan proper security

## Bantuan Lebih Lanjut

Lihat:
- `MONGODB_SETUP.md` - Panduan lengkap
- MongoDB Docs: https://docs.mongodb.com/
- Atlas Docs: https://docs.atlas.mongodb.com/


