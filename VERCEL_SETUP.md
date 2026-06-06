# Vercel setup (Aksara School Management)

Single deployment: Next.js app + API routes in `frontend/`. No separate backend.

## 1. Connect repo

1. Go to [vercel.com](https://vercel.com) → **Add New** → **Project**.
2. Import your Git repo (GitHub/GitLab/Bitbucket).

## 2. Build settings

**Root Directory:** set to **`frontend`** (so Vercel detects Next.js). Enable **“Include source files outside of the Root Directory in the Build Step”** (Project Settings → General → Root Directory) so the monorepo `packages` can be built.

Then use (or let `vercel.json` set):

| Setting | Value |
|--------|--------|
| **Framework Preset** | Next.js |
| **Root Directory** | `frontend` |
| **Build Command** | (from `vercel.json`: runs `build-packages.js` from repo root then `npm run build` in frontend) |
| **Output Directory** | `.next` |
| **Install Command** | (from `vercel.json`: installs root deps when in frontend) |
| **Node.js Version** | 20.x (Settings → General) |

`vercel.json` is written to work when **Root Directory = frontend**: install and build commands `cd ..` to the repo root to run `build-packages.js`, then run the Next.js build in `frontend`.

## 3. Environment variables

In **Project → Settings → Environment Variables**, add:

### Client (NEXT_PUBLIC_*)

From Firebase Console → Project settings → Your apps → web app config.

| Name | Value | Env |
|------|--------|-----|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Your web API key | Production, Preview |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `cognifa-16209.firebaseapp.com` | Production, Preview |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `cognifa-16209` | Production, Preview |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `cognifa-16209.firebasestorage.app` | Production, Preview |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | e.g. `760299044391` | Production, Preview |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Your app ID | Production, Preview |
| `NEXT_PUBLIC_API_URL` | Leave **empty** (same-origin `/api`) | Production, Preview |

### Server (API routes: auth, Firestore)

Login and API routes need Firebase Admin. Use **one** of these:

**Option A – Service account JSON (file on Vercel)**  
Not ideal on Vercel (no persistent files). Prefer B.

**Option B – Env vars from service account JSON (recommended)**

From your service account JSON:

| Name | Value | Env |
|------|--------|-----|
| `FIREBASE_PROJECT_ID` | `cognifa-16209` | Production, Preview |
| `FIREBASE_CLIENT_EMAIL` | `firebase-adminsdk-xxxxx@cognifa-16209.iam.gserviceaccount.com` | Production, Preview |
| `FIREBASE_PRIVATE_KEY` | Full key: `"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"` (keep the quotes and `\n`) | Production, Preview |

To copy the key: open the JSON, use the `private_key` value, replace real newlines with `\n` and wrap in double quotes.

## 4. Deploy

1. Push to `main` (or your production branch) or click **Redeploy** in Vercel.
2. First build can take a few minutes (packages + frontend).
3. Open the deployment URL; log in with a Firebase user that exists in your project.

## 5. If build fails

- **“Cannot find module '@aksara/...'”**  
  Packages must build before the frontend. Ensure **Build Command** runs `node build-packages.js` then `cd frontend && npm install && npm run build`, and **Root Directory** is repo root.

- **“Firebase Admin not configured” / 503 on login**  
  Set `FIREBASE_PROJECT_ID` and either `FIREBASE_SERVICE_ACCOUNT_PATH` or `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY` in Vercel env vars.

- **Node version**  
  In **Settings → General**, set **Node.js Version** to **20.x** if you see Node-related errors.

## 6. Optional: custom domain

**Settings → Domains** → add your domain and follow the DNS instructions.
