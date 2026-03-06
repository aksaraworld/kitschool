# Development Report – 7 Maret 2025

## Summary

Development focused on Principal dashboard features, class management, year detail (Top 3 per jurusan), Cash Flow, Top 10 matrix (UAS/UTS/PR), siswa profile approval by ortu, and dummy data seeding. Build fixes and code cleanup were also done.

---

## Features Implemented

### 1. Tahun Ajaran – Top 3 Siswa per Jurusan

| Item | Description |
|------|-------------|
| **API** | `GET /api/classes/years/[id]/top-students` |
| **Logic** | Groups students by major, aggregates grades (UAS/UTS/PR), computes avg per student, sorts by score desc, returns top 3 per jurusan |
| **UI** | Tahun ajaran detail page (`/years/[id]`) – section "Top 3 Siswa per Jurusan" with cards per major, rank, name (link to profile), avg |

### 2. Cash Flow (Principal)

| Item | Description |
|------|-------------|
| **Firestore** | Collection `cashFlow`: schoolId, type (in/out), amount, description, date |
| **API** | `GET /api/cash-flow` → summary (totalIn, totalOut, saldo) + entries list |
| **API** | `POST /api/cash-flow` → add entry (type, amount, description?, date?) |
| **UI** | Cash Flow page: summary cards (Uang Masuk, Uang Keluar, Saldo), Tambah form, entries table |

### 3. Top 10 Matrix (Faktor_A / Faktor_B / Faktor_C)

| Item | Description |
|------|-------------|
| **Logic** | Dashboard API groups grades by componentKey (UAS/UTS/PR/tugas), applies weighted score from school.rankingMatrix |
| **Defaults** | wUas 50%, wUts 30%, wPr 20% (configurable in Profil Sekolah) |
| **Config** | School doc: `rankingMatrix: { wUas, wUts, wPr }` |
| **UI** | Profil Sekolah – section "Matrix Ranking Top 10"; Dashboard hint updated |

### 4. Siswa Profil Change Approval by Ortu

| Item | Description |
|------|-------------|
| **Firestore** | Collection `pendingProfileChanges`: schoolId, studentId, changes (address/email/phone), status (pending/approved/rejected) |
| **API** | `POST /api/pending-profile-changes` – student creates request |
| **API** | `GET /api/pending-profile-changes` – parent lists pending for their children |
| **API** | `POST /api/pending-profile-changes/[id]/approve` – parent approves, applies to user |
| **API** | `POST /api/pending-profile-changes/[id]/reject` – parent rejects |
| **UI** | ProfileView: student edit address/email/phone → create pending instead of direct PUT |
| **UI** | Children page: "Perubahan Profil Menunggu Persetujuan" section with Approve/Reject |

### 5. Seed Dummy Data

| Item | Description |
|------|-------------|
| **API** | `POST /api/admin/seed-dummy` |
| **Data** | Grades (UAS/UTS/PR), cash flow entries, pending profile change, school rankingMatrix |
| **UI** | Tahun Ajaran page – "Seed Dummy" button (next to Assign Acak) |

---

## Files Added

| Path | Purpose |
|------|---------|
| `frontend/app/api/classes/years/[id]/top-students/route.ts` | Top 3 per jurusan API |
| `frontend/app/api/cash-flow/route.ts` | Cash flow GET/POST |
| `frontend/app/api/admin/seed-dummy/route.ts` | Dummy data seeding |
| `frontend/app/api/pending-profile-changes/route.ts` | Pending changes GET/POST |
| `frontend/app/api/pending-profile-changes/[id]/approve/route.ts` | Approve handler |
| `frontend/app/api/pending-profile-changes/[id]/reject/route.ts` | Reject handler |

---

## Files Modified

| Path | Changes |
|------|---------|
| `frontend/lib/server/firebase-admin.ts` | `cashFlowCollection()`, `pendingProfileChangesCollection()` |
| `frontend/lib/types.ts` | `School.rankingMatrix` |
| `frontend/app/years/[id]/page.tsx` | Top 3 per jurusan section, fetch top-students API |
| `frontend/app/cash-flow/page.tsx` | Full page: summary, list, add form |
| `frontend/app/dashboard/page.tsx` | Matrix hint, Crown/Star `aria-label` |
| `frontend/app/api/dashboard/summary/route.ts` | UAS/UTS/PR matrix, school.rankingMatrix, removed duplicate `activeScholarshipPrograms`, removed unused `classIds` |
| `frontend/app/school-profile/page.tsx` | Matrix Ranking Top 10 section (UAS/UTS/PR %) |
| `frontend/app/children/page.tsx` | Pending profile changes section, Approve/Reject |
| `frontend/components/Profile/ProfileView.tsx` | Student save → create pending when address/email/phone changed |
| `frontend/app/years/page.tsx` | Seed Dummy button + handler |
| `frontend/app/classes/[id]/route.ts` | Fixed duplicate return, added catch |
| `frontend/app/classes/page.tsx` | yearId filter fix, Suspense for useSearchParams |
| `frontend/app/schedules/page.tsx` | Suspense for useSearchParams |
| `frontend/app/users/page.tsx` | Suspense for useSearchParams |

---

## Build & Dev Fixes

- Removed duplicate `return` in classes GET handler; added proper `catch`
- Removed duplicate `activeScholarshipPrograms` in dashboard summary
- Removed unused `classIds` in dashboard summary
- Fixed `yearId` type comparison in classes filter (object vs string)
- Replaced Lucide `title` with `aria-label` for Crown/Star icons
- Wrapped `useSearchParams()` in Suspense for `/classes`, `/schedules`, `/users`
- Clear `.next` cache to fix webpack runtime error on dev

---

## Data Model Additions

| Collection | Fields |
|------------|--------|
| `cashFlow` | schoolId, type, amount, description, date, createdAt, updatedAt |
| `pendingProfileChanges` | schoolId, studentId, changes, status, requestedAt, createdAt, updatedAt |
| `schools` | rankingMatrix: { wUas, wUts, wPr } (optional) |
| `grades` | componentKey (UAS/UTS/PR) used for matrix |

---

## Remaining / Not Implemented

- Top 10 matrix by Faktor_A+B+C with kehadiran (attendance) as additional factor
- Siswa pending-change notification to ortu (e.g. email/push)
- Cash flow: delete/edit entries
- `classPresidentId: null` – if backend strips null, may need `FieldValue.delete()`
