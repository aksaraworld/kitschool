# Kitschool — Firebase & Vercel setup

Separate infra from cognifa. Same codebase; different env per deployment.

| | Cognifa | Kitschool |
|---|---------|-----------|
| GitHub | `aksaraworld/cognifa` | `aksaraworld/kitschool` |
| Firebase project | `cognifa-16209` | `kitschool-b86dd` |
| Vercel project | `cognifa-main` | `kitschool-frontend` |
| Production URL | cognifa deployment | https://kitschool.vercel.app |

---

## 1. Vercel project (`kitschool-frontend`)

**Settings → General**

- Root Directory: `frontend`
- Include source files outside Root Directory: **on**
- Node.js: **20.x** (recommended; currently may show 24.x)

**Settings → Git**

- Connect repo: `aksaraworld/kitschool`
- Production branch: `main`

---

## 2. Environment variables (Vercel)

Project → **Settings → Environment Variables**. Apply to **Production, Preview, Development**.

### Client (already added via CLI)

| Name | Value |
|------|--------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | from Firebase web app config |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `kitschool-b86dd.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `kitschool-b86dd` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `kitschool-b86dd.firebasestorage.app` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `597056593218` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | `1:597056593218:web:cac8fd2d3fd8b4a149fcdb` |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | `G-2ZBSFVPE34` |
| `NEXT_PUBLIC_API_URL` | leave **empty** |

### Server — Firebase Admin (**required for login / API**)

Login calls `/api/auth/me`, which verifies the ID token with Firebase Admin. Without these, you get:

> Server misconfiguration: Firebase Admin credentials required

**Get the service account key:**

1. [Firebase Console](https://console.firebase.google.com/project/kitschool-b86dd/settings/serviceaccounts/adminsdk) → Project settings → Service accounts
2. **Generate new private key** → save JSON locally (gitignored)
3. From the JSON, add to Vercel:

| Name | Value |
|------|--------|
| `FIREBASE_PROJECT_ID` | `kitschool-b86dd` |
| `FIREBASE_CLIENT_EMAIL` | `client_email` from JSON |
| `FIREBASE_PRIVATE_KEY` | `private_key` from JSON — keep `\n` for newlines, wrap in double quotes |

**Quick add from JSON (local):**

```bash
vercel link --project kitschool-frontend
node scripts/set-vercel-firebase-admin.mjs path/to/kitschool-b86dd-firebase-adminsdk.json
vercel --prod   # redeploy
```

---

## 3. Seed Firestore + demo users

Empty Firestore → login succeeds in Firebase Auth but `/api/auth/me` returns **404 User not found**.

```bash
# backend/.env — kitschool service account
FIREBASE_PROJECT_ID=kitschool-b86dd
FIREBASE_SERVICE_ACCOUNT_PATH=../kitschool-b86dd-firebase-adminsdk.json

cd backend
npm run reset:seed:50
# or minimal bootstrap:
BOOTSTRAP_SCHOOL_NAME="Kitschool Demo" npm run bootstrap:firebase
```

Deploy rules (once):

```bash
firebase use kitschool-b86dd   # add to .firebaserc if needed
firebase deploy --only firestore:rules,storage
```

Demo logins after seed: see `DEMO_ACCOUNTS.md`.

---

## 4. Local dev (kitschool)

```bash
cp frontend/.env.kitschool.local.example frontend/.env.local
# place service account JSON at repo root, update path if needed
cd backend && cp ../frontend/.env.kitschool.local.example .env  # adjust for backend paths
npm run dev
```

---

## 5. Admin error checklist

| Symptom | Cause | Fix |
|---------|--------|-----|
| `Firebase Admin credentials required` (503) | Missing `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` on Vercel | Add admin env vars, redeploy |
| `Invalid token` (401) after login | Admin creds are for **wrong** project (e.g. cognifa key on kitschool) | Use kitschool service account only |
| `User not found` (404) | Auth user exists but no Firestore `users/{uid}` doc | Run seed/bootstrap on **kitschool-b86dd** |
| Firebase client error on login page | Missing `NEXT_PUBLIC_FIREBASE_*` at **build** time | Set env vars in Vercel, redeploy (not just save — must rebuild) |
| Storage / rules errors | Rules not deployed to kitschool project | `firebase deploy --only firestore:rules,storage` |

Check deployment config:

```bash
curl -s https://kitschool.vercel.app/api/health | jq
```

Look for `firebase.clientConfigured` and `firebase.adminConfigured`.

---

## 6. Cognifa vs kitschool — do not mix

- Never copy cognifa `FIREBASE_PRIVATE_KEY` into kitschool Vercel.
- Each Vercel project has its own env; code is shared via dual git push.
- Rotate any key that was ever committed to git.
