# Kitschool — Complete Feature List

**Tagline:** *Lacak. Terhubung. Percaya. Semua dalam Satu Tempat.*

**Product:** Multi-tenant school management SaaS for Indonesia — pesantren, MTs, MA, and general schools.

**Live demo:**
- Platform: [kitschool.vercel.app](https://kitschool.vercel.app)
- PPST Al UM landing: [kitschool.vercel.app/school/ppst-alum](https://kitschool.vercel.app/school/ppst-alum)
- Tenant subdomain: `al-um.kithome.id`

---

## Slide 1 — Platform Overview

- One platform, many schools (multi-tenant SaaS)
- Per-school branding: logo, subdomain, custom domain
- Modular activation (e.g. asrama on/off per sekolah)
- Firebase Auth + Firestore, Next.js 14, deployed on Vercel
- Mobile-friendly UI across staff, parent, and student portals

---

## Slide 2 — User Roles (18 roles)

| Layer | Roles |
|-------|--------|
| **Platform** | SaaS Admin |
| **Yayasan / Pesantren** | Ketua Yayasan, Ketua Pesantren |
| **Sekolah** | Kepala Sekolah, Wakasek (3), Kepala Program, Kaprodi, Koordinator BK/Eskul, Koordinator Lab/Perpus |
| **Operasional** | Staff/TU, Keuangan |
| **Akademik** | Guru Produktif, Guru, Wali Kelas |
| **Komunitas** | Siswa, Orang Tua |

**Highlights:**

- Multi-role per user (e.g. Wali Kelas + Staff TU)
- Configurable role permissions per school
- Unit Switcher: filter data by jenjang (MTs / MA)

---

## Slide 3 — SaaS Admin & Multi-Tenant

- **School registry** — create, edit, activate/deactivate schools
- **Subscription management** — trial / active / suspended / expired
- **Per-school config** — jenjang, units (MTs+MA), leadership, modules
- **School Switcher** — operate any tenant from admin panel
- **Platform dashboard** — total schools, active/trial, transaction fees
- **Subscription pricing** — admin fee %, per-student fee, gateway fees
- **Landing page builder** — slug, hero, programs, public chat toggle
- **Domain setup** — subdomain (`al-um.kithome.id`) + custom domain field

---

## Slide 4 — Akademik: Struktur Sekolah

- **Tahun Ajaran** — active year, date range, stats per year
- **Kelas** — capacity, wali kelas, ketua kelas, roster siswa
- **Jurusan / Peminatan** — per jenjang (IPA, IPS, Bahasa, Agama, dll.)
- **Mata Pelajaran** — katalog mapel, kategori, assign guru
- **Jadwal** — kelas / ujian / libur / acara; bulan/minggu/hari
- **Kalender** — jadwal akademik + kegiatan asrama (tadarus, kajian, dzikir)

---

## Slide 5 — Akademik: Kehadiran & Nilai

### Kehadiran

- Check-in siswa & guru (hadir, terlambat, izin, alpa, cuti)
- Rekap harian & bulanan per kelas
- Staff monitoring per tanggal

### Nilai & Ranking

- Input nilai UTS, UAS, PR per mapel
- Matrix ranking Top 10 (bobot UAS/UTS/PR configurable)
- Dashboard: Top 10 nilai & Top 10 kehadiran
- Guru per jurusan (chart)

### Laporan

- Hub laporan: dashboard, kehadiran, pembayaran, siswa, akademik
- Filter tanggal / kelas / siswa

---

## Slide 6 — Keuangan: Katalog & Jenjang Split

### Katalog Biaya

- Lini produk: MTs, MA, MTs & MA, Pesantren, Yayasan
- Kategori: SPP bulanan, iuran pesantren, tahunan, pendaftaran, lainnya
- Frekuensi: bulanan, semester, tahunan, sekali bayar
- Generate tagihan bulanan massal dari katalog

### Split Keuangan

- Setiap biaya & transaksi ditag ke unit: MTs / MA / Pesantren / Yayasan
- Laporan pendapatan per unit + per kategori
- Cocok untuk yayasan dengan banyak jenjang dalam satu sistem

---

## Slide 7 — Keuangan: POS & Tagihan

### POS (Point of Sale)

- Touch-friendly: cari siswa, +/- qty, sticky checkout
- Bayar tagihan outstanding + item katalog ad-hoc dalam satu checkout
- Filter jenjang / tahun / kelas
- Siswa MA hanya lihat item MA + shared pesantren
- Rekomendasi item berdasarkan profil siswa
- Offline-capable workflow (server sync)
- Breakdown per finance unit di struk

### Tagihan & Pembayaran

- Daftar tagihan: pending, partial, paid, overdue
- Parent bayar via portal (transfer, e-wallet, cash + bukti)
- Konfirmasi admin untuk pembayaran manual
- **Cash Flow** (Kepala Sekolah) — catat pemasukan/pengeluaran manual

---

## Slide 8 — Modul Asrama (Boarding) — Overview

*Aktif per sekolah via `modules.boardingSchool`*

**8 tab manajemen dalam satu panel:**

| Tab | Fitur |
|-----|--------|
| Dashboard | Okupansi, izin pending, HP hari ini, kegiatan malam, kartu per kamar |
| Area | Asrama putra/putri + zona kegiatan (musholla, lapangan, aula) |
| Kamar | Assign santri, ketua kamar, pembina, kapasitas, filter area/gender |
| Jadwal | Tadarus, kajian, dzikir, olahraga — recurring per hari |
| Absensi | Malam + kegiatan ibadah; hadir/sakit/izin/alpa |
| Izin Keluar | Approve/reject/return; notifikasi ke ortu |
| HP | Serah/kembali HP; kebijakan hari sekolah |
| Keuangan | Tagihan pending santri asrama → link ke invoices |

---

## Slide 9 — Asrama: Detail Fitur

### Manajemen Kamar

- Sync otomatis `studentIds` ↔ `boardingRoomId` di profil siswa
- Ketua kamar + kepala kamar (staf) dengan link profil
- Bulk import CSV: `roomId,studentId`
- Chat ortu per kamar (multi-parent picker)

### Kebijakan HP

- Restrict on school days (Sen–Sab)
- Ketua kamar boleh pegang HP (configurable)
- Status real-time: diserahkan / dipegang / belum dicatat

### Notifikasi

- Ortu ajukan izin → push + in-app ke staf asrama
- Staf approve/tolak → push + in-app ke ortu

### Dashboard Ketua Pesantren

- Widget di `/dashboard`: okupansi, izin pending, kegiatan malam

---

## Slide 10 — Portal Orang Tua

### Anak Saya (`/children`)

- Profil anak: kelas, tahun, jurusan, kamar asrama
- Ketua kamar & pembina
- Status HP hari ini
- Riwayat absensi asrama
- Kegiatan malam ini (tadarus/kajian)
- **Ajukan izin keluar asrama** + riwayat status
- Approval perubahan profil anak (alamat/email/telepon)

### Akademik & Keuangan

- Tagihan & pembayaran
- Kehadiran, kalender, laporan per anak
- Pesan ke sekolah
- Tiket masukan & keluhan

---

## Slide 11 — Chat, Tiket & CRM

### Pesan Internal

- Chat 1:1: ortu ↔ guru/staf/keuangan/pimpinan
- FAB chat + badge unread
- Real-time messages
- Tab filter: Semua / CRM Web / Internal

### CRM Landing Page

- Widget chat di halaman publik sekolah
- Visitor anonymous → session → tiket CRM otomatis
- Multi-staff CS (staff, finance, principal, ketua pesantren/yayasan)
- Staff balas dari app Pesan; sinkron ke tiket
- Label `[CS Web]` + link ke tiket

### Tiket & Keluhan

- Kategori: Akademik, BK, Sarana, Keuangan, Asrama, Umum
- Workflow: open → acknowledged → in_progress → resolved → closed
- Sumber: portal ortu / live chat landing
- Stats dashboard untuk manajemen
- Deep link `?ticket=...`

---

## Slide 12 — Beasiswa, Profil Sekolah & Landing

### Beasiswa

- CRUD program beasiswa (aktif/nonaktif)
- Tampil di dashboard kepala sekolah
- Link ke tahun ajaran

### Profil Sekolah

- Identitas, logo, akreditasi, rekening bank
- Matrix ranking Top 10
- Config asrama (phone policy)
- Units MTs/MA + leadership

### Landing Page Publik

- Hero, highlights, program unggulan, statistik
- Showcase asrama & jadwal malam (pesantren)
- CTA Masuk Portal + live chat
- Preview: `/school/{slug}` atau subdomain tenant
- Branding login per sekolah

---

## Slide 13 — Notifikasi & Push

- Bell notifikasi in-app (agregat unread)
- Tipe: chat, komunikasi, tiket, asrama
- Firebase Cloud Messaging (FCM) push
- Deep link ke percakapan / tiket / asrama / anak saya
- Toast saat pesan baru di luar halaman chat
- Notifikasi izin keluar asrama (ortu ↔ staf)

---

## Slide 14 — Keamanan & Infrastruktur

- Tenant isolation via `schoolId` di semua koleksi
- Firestore security rules (client read, server write untuk data sensitif)
- Role-based route protection
- SaaS admin di subdomain sekolah → redirect ke platform URL
- Custom domain per sekolah (`*.kithome.id`)
- Health check API untuk monitoring deploy

---

## Slide 15 — Demo: PPST Al UM (Kitschool Pilot)

**Sekolah:** Pondok Pesantren Salafiyah Terpadu Al-Um, Bogor

### Struktur organisasi

- 1 Yayasan → Ketua Yayasan
- 1 Pesantren → Ketua Pesantren (asrama)
- 2 Jenjang: MTs (10 siswa) + MA (10 siswa, 4 peminatan)
- 20 akun ortu, staff TU, guru wali kelas

### Data demo asrama

- Asrama Putra A1 + Putri B1
- Jadwal: tadarus (Sen–Sel), kajian (Kam), dzikir (Jum), olahraga (Sab)
- Kebijakan HP aktif

### Data demo keuangan

- SPP + iuran pesantren bulanan (900rb)
- Iuran tahunan yayasan (15jt)
- Biaya pendaftaran & seragam per jenjang
- Laporan split MTs / MA / Pesantren / Yayasan

### Akses demo

Lihat [KITSCHOOL_DEMO_ACCOUNTS.md](./KITSCHOOL_DEMO_ACCOUNTS.md) · password `ppst2025`

---

## Slide 16 — Value Proposition (Closing)

### Sudah live

- Akademik end-to-end
- Keuangan multi-jenjang + POS
- Asrama full lifecycle
- CRM + chat + tiket
- Portal ortu
- Multi-tenant SaaS

### Differentiators

1. **Satu sistem** untuk yayasan + MTs + MA + pesantren
2. **Split keuangan** per unit tanpa spreadsheet terpisah
3. **Asrama terintegrasi** dengan kalender, keuangan, chat ortu
4. **CRM built-in** dari landing page → tiket → staff reply
5. **White-label** subdomain + branding per sekolah

---

## Quick Reference — Menu per Role

| Role | Menu utama |
|------|------------|
| SaaS Admin | Ringkasan, Sekolah, Langganan |
| Kepala Sekolah | Full: akademik, keuangan, asrama, beasiswa, CRM, role management |
| Ketua Pesantren | Users, asrama, katalog biaya, CRM, laporan |
| Ketua Yayasan | + laporan keuangan |
| Staff/TU | Users, kelas, tahun, jadwal, POS, tagihan, asrama, CRM |
| Keuangan | POS, katalog, tagihan, laporan |
| Guru | Kelas, jadwal, kalender, pesan |
| Ortu | Anak saya, tagihan, kehadiran, pesan, tiket |
| Siswa | Dashboard, kehadiran, kalender, laporan |

---

## Related Docs

- [KITSCHOOL_DEMO_ACCOUNTS.md](./KITSCHOOL_DEMO_ACCOUNTS.md) — demo logins
- [CUSTOM_DOMAINS.md](./CUSTOM_DOMAINS.md) — domain & subdomain setup
- [KITSCHOOL_SETUP.md](./KITSCHOOL_SETUP.md) — deploy & env vars
