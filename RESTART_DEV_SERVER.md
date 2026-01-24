# Cara Restart Development Server

Jika mengalami error 404 pada static assets Next.js, ikuti langkah berikut:

## 1. Hentikan Semua Proses Node.js

Di PowerShell, jalankan:
```powershell
Get-Process | Where-Object {$_.ProcessName -like "*node*"} | Stop-Process -Force
```

## 2. Clear Cache Next.js

```powershell
cd frontend
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
```

## 3. Restart Development Server

### Opsi A: Dari Root (Recommended)
```powershell
cd ..
npm run dev
```

### Opsi B: Manual (Frontend & Backend Terpisah)
```powershell
# Terminal 1 - Frontend
cd frontend
npm run dev

# Terminal 2 - Backend
cd backend
npm run dev
```

## 4. Tunggu Server Selesai Compile

Tunggu sampai melihat pesan:
```
✓ Ready in X seconds
○ Compiling / ...
✓ Compiled / in X seconds
```

## 5. Akses Aplikasi

Buka browser di: `http://localhost:3000`

**Jangan langsung akses `/attendance`** - akses root dulu (`http://localhost:3000`), lalu navigasi melalui aplikasi.

## Troubleshooting

### Jika masih error 404:
1. Pastikan port 3000 tidak digunakan aplikasi lain
2. Cek apakah backend juga running di port 5000
3. Clear browser cache (Ctrl+Shift+Delete)
4. Coba hard refresh (Ctrl+F5)

### Jika port 3000 sudah digunakan:
```powershell
# Cek proses di port 3000
Get-NetTCPConnection -LocalPort 3000

# Kill proses
Stop-Process -Id <PID> -Force
```


