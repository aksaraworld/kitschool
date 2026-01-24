# Cara Memperbaiki Error 401 Unauthorized

Error 401 terjadi karena Anda belum login atau token authentication tidak ada/expired.

## Solusi Cepat

### 1. Login Ulang
Buka browser dan akses: `http://localhost:3000/login`

Gunakan kredensial yang sesuai dengan role Anda:

**SaaS Admin:**
- Email: `saas@cognifa.com`
- Password: `saasadmin123`

**Principal:**
- Email: `principal@smkdemodepok.sch.id`
- Password: `principal123`

**Staff:**
- Email: `staff1@smkdemodepok.sch.id`
- Password: `staff123`

**Finance:**
- Email: `finance1@smkdemodepok.sch.id`
- Password: `finance123`

**Teacher:**
- Email: `teacher1@smkdemodepok.sch.id`
- Password: `teacher123`

**Student:**
- Email: `s0001@smkdemodepok.sch.id`
- Password: `student123`

**Parent:**
- Email: `parent0001@smkdemodepok.sch.id`
- Password: `parent123`

### 2. Clear Browser Storage (Jika Masih Error)

Buka Developer Tools (F12), lalu di Console jalankan:
```javascript
localStorage.clear();
location.reload();
```

Atau:
1. Buka Developer Tools (F12)
2. Tab **Application** (Chrome) atau **Storage** (Firefox)
3. Klik **Local Storage** → `http://localhost:3000`
4. Klik kanan → **Clear**
5. Refresh halaman (F5)

### 3. Pastikan Backend Running

Pastikan backend server juga running di port 5000:
```powershell
cd backend
npm run dev
```

Anda harus melihat:
```
✅ MongoDB connected successfully
Server running on port 5000
```

## Penjelasan Error

Error 401 Unauthorized berarti:
- Token tidak ada di localStorage
- Token sudah expired
- Token tidak valid
- Backend tidak bisa memverifikasi token

Setelah login, token akan disimpan di localStorage dan semua request API akan otomatis include token tersebut.

## Auto-Redirect

Sekarang sistem sudah otomatis redirect ke login page jika mendapat error 401. Jadi jika token expired atau tidak valid, Anda akan otomatis diarahkan ke halaman login.


