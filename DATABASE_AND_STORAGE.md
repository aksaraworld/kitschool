# Database & Storage – Aksara School Management

## Firestore (primary data)

- **Used by:** Serverless API (`frontend/app/api/auth/*`), backend scripts (seed, reset), and optionally Express backend.
- **Where:** Firebase project **cognifa-16209**. Server-side access via `frontend/lib/server/firebase-admin.ts` (Admin SDK) and backend `backend/src/config/firebase-adc.ts` (service account).
- **Collections:** Users, schools, and related app data. Auth is Firebase Auth; user profile and role live in Firestore (`users` collection). Schools in `schools` collection.
- **Docs:** See [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) for structure. [SERVERLESS.md](./SERVERLESS.md) describes the serverless auth/me and register API.

## Firebase Storage (files)

- **Used by:** Frontend only, for file uploads (e.g. avatars, documents).
- **Where:** `frontend/lib/firebaseStorage.ts` – `uploadFile()`, `deleteFile()`, `getDownloadURL()`, etc. Bucket is the default Firebase Storage bucket for the same project.
- **Rules:** Configure in Firebase Console and/or `storage.rules` in repo.

## Summary

| Layer        | Firestore              | Storage                 |
|-------------|------------------------|-------------------------|
| Serverless  | Auth/me, register, etc.| —                       |
| Backend     | Seed, reset, scripts   | —                       |
| Frontend    | Via /api and backend   | firebaseStorage.ts      |

## First-time setup (empty project)

See **[FIREBASE_CONNECT.md](./FIREBASE_CONNECT.md)** for: env vars, deploying Firestore/Storage rules, and running the seed script (`cd backend && npm run reset:seed:50`) to create 50 demo accounts and sample school data.
