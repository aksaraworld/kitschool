# Setup MongoDB untuk Cognifa

## Error yang Terjadi
```
MongooseServerSelectionError: connect ECONNREFUSED ::1:27017
```
Error ini berarti MongoDB tidak berjalan atau tidak bisa diakses.

## Solusi 1: Install & Start MongoDB Local (Windows)

### Step 1: Install MongoDB
1. Download MongoDB Community Server dari: https://www.mongodb.com/try/download/community
2. Pilih:
   - Version: Latest (7.0 atau terbaru)
   - Platform: Windows
   - Package: MSI
3. Install dengan default settings
4. Pilih "Install MongoDB as a Service" saat instalasi

### Step 2: Start MongoDB Service
MongoDB biasanya auto-start sebagai Windows Service. Jika tidak:

**Via Services:**
1. Tekan `Win + R`
2. Ketik `services.msc` dan Enter
3. Cari "MongoDB"
4. Klik kanan → Start (jika stopped)

**Via Command Prompt (Admin):**
```bash
net start MongoDB
```

**Via PowerShell (Admin):**
```powershell
Start-Service MongoDB
```

### Step 3: Verify MongoDB Running
```bash
# Test connection
mongosh
# atau
mongo
```

Jika berhasil, akan muncul MongoDB shell prompt.

### Step 4: Update .env
Pastikan `backend/.env` sudah benar:
```env
MONGODB_URI=mongodb://localhost:27017/sekolahkita
```

## Solusi 2: Gunakan MongoDB Atlas (Cloud) - RECOMMENDED

MongoDB Atlas lebih mudah dan tidak perlu install lokal.

### Step 1: Buat Account
1. Buka https://www.mongodb.com/cloud/atlas/register
2. Buat account gratis
3. Pilih "Build a Database" → "FREE" (M0 Sandbox)

### Step 2: Setup Cluster
1. Pilih Cloud Provider: AWS (atau Google Cloud/Azure)
2. Pilih Region: Pilih yang terdekat (misal: Singapore untuk Indonesia)
3. Cluster Name: `Cluster0` (default)
4. Klik "Create"

### Step 3: Setup Database User
1. Username: buat username (misal: `sekolahkita`)
2. Password: buat password yang kuat
3. **SIMPAN PASSWORD INI!** (akan dipakai di connection string)
4. Klik "Create Database User"

### Step 4: Setup Network Access
1. Klik "Network Access" di sidebar
2. Klik "Add IP Address"
3. Pilih "Allow Access from Anywhere" (0.0.0.0/0) untuk development
   - **Note**: Untuk production, gunakan IP specific
4. Klik "Confirm"

### Step 5: Get Connection String
1. Klik "Database" → "Connect"
2. Pilih "Connect your application"
3. Driver: Node.js, Version: 5.5 or later
4. Copy connection string, contoh:
```
mongodb+srv://sekolahkita:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

### Step 6: Update .env
Edit `backend/.env`:
```env
MONGODB_URI=mongodb+srv://sekolahkita:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/sekolahkita?retryWrites=true&w=majority
```

**Ganti:**
- `YOUR_PASSWORD` dengan password yang dibuat di Step 3
- `cluster0.xxxxx` dengan cluster name Anda
- `sekolahkita` (setelah .net/) adalah database name

## Solusi 3: Gunakan Docker (Alternatif)

Jika sudah install Docker Desktop:

### Step 1: Run MongoDB Container
```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### Step 2: Verify
```bash
docker ps
```

### Step 3: Update .env
```env
MONGODB_URI=mongodb://localhost:27017/sekolahkita
```

## Troubleshooting

### MongoDB Service Tidak Start
```bash
# Check service status
sc query MongoDB

# Start service (Admin)
net start MongoDB

# Jika error, check logs
# Logs biasanya di: C:\Program Files\MongoDB\Server\7.0\log\mongod.log
```

### Port 27017 Already in Use
```bash
# Check apa yang menggunakan port 27017
netstat -ano | findstr :27017

# Kill process (ganti PID dengan nomor dari netstat)
taskkill /PID <PID> /F
```

### Connection String Error
- Pastikan tidak ada spasi di connection string
- Pastikan password di-encode jika ada special characters
- Untuk Atlas, pastikan IP whitelist sudah di-set

### Test Connection Manual
```bash
# Install mongosh jika belum
# Download dari: https://www.mongodb.com/try/download/shell

# Test local
mongosh mongodb://localhost:27017

# Test Atlas
mongosh "mongodb+srv://username:password@cluster.mongodb.net/"
```

## Quick Fix untuk Development

**Opsi Tercepat: Gunakan MongoDB Atlas**

1. Buat account Atlas (5 menit)
2. Buat cluster gratis
3. Setup user & network access
4. Copy connection string
5. Update `backend/.env`
6. Restart aplikasi

**Tidak perlu install MongoDB lokal!**

## Verify Setup

Setelah setup, test dengan:

```bash
# Start backend
cd backend
npm run dev
```

Jika berhasil, akan muncul:
```
MongoDB connected
Server running on port 5000
```

Jika masih error, check:
1. ✅ MongoDB service running (untuk local)
2. ✅ Connection string benar di `.env`
3. ✅ Network access di-set (untuk Atlas)
4. ✅ Password benar (untuk Atlas)
5. ✅ Database name ada di connection string

## Next Steps

Setelah MongoDB connected:
1. Run seed: `npm run seed`
2. Start app: `npm run dev`
3. Login: http://localhost:3000

