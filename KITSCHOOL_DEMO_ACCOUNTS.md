# Kitschool — PPST Al UM Demo Accounts

Firebase project: `kitschool-b86dd`  
School: **PPST Al UM** — Pondok Pesantren Salafiyah Terpadu Al-Um, Bogor

**Public landing:** https://kitschool.vercel.app/school/ppst-alum  
**Custom domain (when DNS set):** `ppst-alum.sch.id` → same landing page

## Platform admin

| Role | Email | Password |
|------|-------|----------|
| SaaS Admin | `admin@kitshool.com` | `kitschool2025` |

## Leadership (boarding / 2 jenjang) — password `ppst2025`

| Role | Email | Name |
|------|-------|------|
| Ketua Yayasan | `ketua.yayasan@ppst-alum.sch.id` | H. Abdul Rahman, Lc. |
| Ketua Pesantren | `ketua.pesantren@ppst-alum.sch.id` | Ust. Yusuf Ma'sum, M.Ag. |
| Kepala Sekolah **MTs** | `kepsek.mts@ppst-alum.sch.id` | Ust. Ahmad Fauzi, M.Pd.I |
| Kepala Sekolah **MA** | `kepsek.ma@ppst-alum.sch.id` | Ust. Zainuddin, M.Pd. |

## School staff (1 each) — `ppst2025`

| Role | Email |
|------|-------|
| Staff | `staff@ppst-alum.sch.id` |
| Staff TU | `tu@ppst-alum.sch.id` |
| Guru / Wali Kelas | `guru@ppst-alum.sch.id` |

## MTs — 10 siswa + 10 orang tua (`ppst2025`)

| Siswa | Email siswa | Email orang tua |
|-------|-------------|-----------------|
| VII A | `mts01@ppst-alum.sch.id` … `mts10@…` | `ortu-mts01@…` … `ortu-mts10@…` |

## MA — 10 siswa + 10 orang tua (`ppst2025`)

| Peminatan | Siswa |
|-----------|-------|
| IPA (Saintek) | 3 — `ma01`–`ma03@…` |
| IPS (Soshum) | 3 — `ma04`–`ma06@…` |
| Bahasa | 2 — `ma07`–`ma08@…` |
| Agama | 2 — `ma09`–`ma10@…` |

## Re-seed

```bash
cd backend
FIREBASE_PROJECT_ID=kitschool-b86dd \
FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/kitschool-adminsdk.json \
SEED_RESET=1 npm run seed:kitschool
```
