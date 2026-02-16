# Connect Firebase Firestore & Storage (when empty)

Use this when your Firebase project **cognifa-16209** has empty Firestore and you want to connect and seed data.

---

## 1. Environment

### Frontend (`frontend/.env.local`)

Already set for **Auth + client** (login, Storage in browser):

- `NEXT_PUBLIC_FIREBASE_*` (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId, measurementId)
- `FIREBASE_PROJECT_ID=cognifa-16209`
- `FIREBASE_SERVICE_ACCOUNT_PATH=../cognifa-16209-firebase-adminsdk-fbsvc-47ae77c666.json`  
  (path to service account JSON, relative to `frontend` when Next runs)

So **Firestore** is used via the Next.js API routes (server-side Admin SDK). **Storage** is used from the browser via `frontend/lib/firebaseStorage.ts` (same project, default bucket).

### Backend (for seeding)

To **populate** Firestore (and Auth) when empty, run the seed script from the backend. It needs Firebase Admin env in **backend**:

**Option A – backend/.env**

```env
FIREBASE_PROJECT_ID=cognifa-16209
FIREBASE_SERVICE_ACCOUNT_PATH=../cognifa-16209-firebase-adminsdk-fbsvc-47ae77c666.json
```

(Path is relative to `backend` folder, so `../` points to project root where the JSON file lives.)

**Option B – same file as frontend**

If you run the seed from project root and your backend loads `./.env`, put the same vars in the root `.env` (and keep the JSON path correct for where Node’s `process.cwd()` is when you run the script).

---

## 2. Deploy Firestore & Storage rules

So the app (and seed) can read/write safely:

1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login: `firebase login`
3. In project root: `firebase use cognifa-16209`
4. Deploy rules:
   - Firestore: `firebase deploy --only firestore:rules`
   - Storage: `firebase deploy --only storage`

Rule files in repo: `firestore.rules`, `storage.rules`. If you use a different project ID, create/update `firebase.json` and `.firebaserc` accordingly.

---

## 3. Seed Firestore (and Auth) when empty

From **project root** (so backend can find the service account at `../` from backend):

```bash
cd backend
npm run reset:seed:50
```

This script:

- Deletes all Firebase Auth users and all documents in the Firestore collections it uses.
- Creates **1 school**, **1 year**, **1 major**, **1 class**.
- Creates **50 demo users** in Auth + Firestore (1 SaaS admin, 1 principal, 4 staff, 4 finance, 12 teachers, 15 students, 13 parents).

Credentials: see **DEMO_ACCOUNTS.md** (e.g. `saas@cognifa.com` / `saasadmin123`, `principal@smkdemodepok.sch.id` / `principal123`).

**Minimal bootstrap (1 school + 2 users only):**

```bash
cd backend
BOOTSTRAP_SAAS_ADMIN_EMAIL=saas@cognifa.com BOOTSTRAP_SAAS_ADMIN_PASSWORD=saasadmin123 BOOTSTRAP_PRINCIPAL_EMAIL=principal@smkdemodepok.sch.id BOOTSTRAP_PRINCIPAL_PASSWORD=principal123 npm run bootstrap:firebase
```

(Also set `FIREBASE_PROJECT_ID` and `FIREBASE_SERVICE_ACCOUNT_PATH` in backend env.)

---

## 4. Storage

- **Connection:** The frontend already uses the default Storage bucket for **cognifa-16209** via `frontend/lib/firebaseStorage.ts` and the client SDK (same config as Auth).
- **When “empty”:** You don’t need to seed Storage. Files appear when users upload (e.g. avatars, payment proofs) using your app. Ensure Storage is **enabled** in Firebase Console → Storage.
- **Rules:** Deploy `storage.rules` as in step 2 so authenticated users can read/write the paths your app uses (e.g. `avatars/`, `payments/`, `documents/`).

---

## Summary

| Step | Action |
|------|--------|
| 1 | Keep `frontend/.env.local` with Firebase client + Admin path (for API routes). |
| 2 | Set `backend/.env` (or root `.env`) with `FIREBASE_PROJECT_ID` and `FIREBASE_SERVICE_ACCOUNT_PATH` for the seed script. |
| 3 | Deploy `firestore.rules` and `storage.rules` with Firebase CLI. |
| 4 | Run `cd backend && npm run reset:seed:50` once to fill Firestore + Auth. |
| 5 | Storage fills as users upload; ensure Storage is enabled and rules deployed. |

After this, the app is connected to Firestore and Storage; login and all serverless API routes use Firestore, and uploads use Storage.
