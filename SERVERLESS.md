# Serverless setup (Vercel + Firebase)

Aksara School Management runs **fully serverless** on Vercel: no separate Express/Cloud Run backend. API lives in **Next.js Route Handlers** under `frontend/app/api/`, following the Aksara pattern.

## What’s implemented

- **Auth (serverless):** `GET /api/auth/me`, `POST /api/auth/register`  
  Use Firebase Admin in serverless (env: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` on Vercel).
- **Health:** `GET /api/health`
- **Frontend:** Uses same-origin `/api` when `NEXT_PUBLIC_API_URL` is **not** set (default).

## Env (Vercel)

- **Client:** `NEXT_PUBLIC_FIREBASE_*` (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId).
- **Server (API routes):** `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (for Firebase Admin; no key file in serverless).

Do **not** set `NEXT_PUBLIC_API_URL` so the app calls the same Vercel deployment for `/api/*`.

## DB: 50 demo accounts only

- **Reset + seed:** `cd backend && npm run reset:seed:50`  
  Deletes all Firestore data and Firebase Auth users, then creates exactly **50 demo accounts** + 1 school.  
  See **DEMO_ACCOUNTS.md** for the list.

## Remaining API surface

Other endpoints (users, school, classes, invoices, etc.) still exist in the **Express backend** (`backend/`). To go **fully serverless** without Cloud Run:

- Reimplement those routes as **Next.js Route Handlers** under `frontend/app/api/` (e.g. `app/api/users/route.ts`, `app/api/school/route.ts`, …).
- Reuse `frontend/lib/server/firebase-admin.ts` and the same Firestore collections.

Until then you can either run the Express backend locally and set `NEXT_PUBLIC_API_URL` for dev, or migrate routes incrementally to `app/api/*`.
