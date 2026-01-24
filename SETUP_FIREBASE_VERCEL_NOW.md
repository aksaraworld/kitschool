# 🚀 Complete Firebase + Vercel Setup Guide

## Your Firebase Project Info
- **Project Name:** cognifa-app
- **Project ID:** cognifa-app
- **Project Number:** 402405414048
- **Organization:** cognifa-id-org

✅ Firestore: Done  
✅ Storage: Done  
✅ Auth: Done  
⚠️ Service Account Key: Restricted (we'll use ADC instead)

---

## Part 1: Firebase Setup (Local Development)

### Step 1: Install Google Cloud SDK

**Windows:**
1. Download: https://cloud.google.com/sdk/docs/install
2. Run installer
3. Restart PowerShell/terminal

**Verify installation:**
```powershell
gcloud --version
```

### Step 2: Set Up Application Default Credentials (ADC)

```powershell
# Login to Google Cloud
gcloud auth login

# Set up Application Default Credentials (this replaces service account key)
gcloud auth application-default login

# Set your Firebase project
gcloud config set project cognifa-app

# Verify
gcloud config get-value project
```

You should see: `cognifa-app`

### Step 3: Get Firebase Client Config

1. Go to: https://console.firebase.google.com/project/cognifa-app
2. Click **⚙️ Project Settings** (gear icon)
3. Scroll to **"Your apps"** section
4. Click **Web icon** (`</>`)
5. Register app:
   - App nickname: `Cognifa Web`
   - Firebase Hosting: **No** (we're using Vercel)
6. Click **"Register app"**
7. **Copy the `firebaseConfig` object** - you'll need this for Vercel!

It looks like:
```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "cognifa-app.firebaseapp.com",
  projectId: "cognifa-app",
  storageBucket: "cognifa-app.appspot.com",
  messagingSenderId: "402405414048",
  appId: "1:402405414048:web:..."
};
```

### Step 4: Deploy Security Rules

```powershell
# Install Firebase CLI (if not installed)
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase (from project root)
firebase init
```

**Select:**
- ✅ Firestore
- ✅ Storage
- Use existing project → Select `cognifa-app`
- Firestore rules file: `firestore.rules` (already exists)
- Firestore indexes: `firestore.indexes.json` (create if needed)
- Storage rules file: `storage.rules` (already exists)

**Deploy rules:**
```powershell
firebase deploy --only firestore:rules,storage:rules
```

### Step 5: Test Local Setup

```powershell
# Backend
cd backend
npm run dev
```

You should see:
```
✅ Firebase Admin initialized with Application Default Credentials
```

**Frontend:**
```powershell
# New terminal
cd frontend
npm run dev
```

Open http://localhost:3000 - should see login page with no errors.

---

## Part 2: Vercel Setup

### Step 1: Create Vercel Account

1. Go to: https://vercel.com
2. Sign up with GitHub (recommended)

### Step 2: Connect GitHub Repository

1. Go to: https://vercel.com/dashboard
2. Click **"Add New"** → **"Project"**
3. Import your GitHub repository
4. Click **"Import"**

### Step 3: Configure Project Settings

**Root Directory:** `.` (project root, NOT frontend)

**Build Settings:**
- **Framework Preset:** Next.js (auto-detected)
- **Build Command:** `cd frontend && npm run build`
- **Output Directory:** `frontend/.next`
- **Install Command:** `bash vercel-install.sh`

### Step 4: Add Environment Variables

Go to **Settings** → **Environment Variables** in Vercel dashboard.

#### Frontend Environment Variables

Add these **one by one** (case-sensitive):

```
NEXT_PUBLIC_API_URL=https://your-backend-url.vercel.app
```
*(We'll get this after deploying backend)*

```
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
```
*(From Step 3 - firebaseConfig.apiKey)*

```
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=cognifa-app.firebaseapp.com
```
*(From Step 3 - firebaseConfig.authDomain)*

```
NEXT_PUBLIC_FIREBASE_PROJECT_ID=cognifa-app
```
*(From Step 3 - firebaseConfig.projectId)*

```
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=cognifa-app.appspot.com
```
*(From Step 3 - firebaseConfig.storageBucket)*

```
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=402405414048
```
*(From Step 3 - firebaseConfig.messagingSenderId)*

```
NEXT_PUBLIC_FIREBASE_APP_ID=1:402405414048:web:...
```
*(From Step 3 - firebaseConfig.appId)*

**Important:** 
- ✅ Check "Production", "Preview", and "Development" for all variables
- ✅ All variables must start with `NEXT_PUBLIC_` to be accessible in frontend

### Step 5: Deploy Frontend

1. Click **"Deploy"**
2. Wait for build (2-5 minutes)
3. Check build logs for errors
4. Copy the deployment URL (e.g., `https://cognifa-app.vercel.app`)

---

## Part 3: Backend Deployment (Vercel)

### Option A: Deploy Backend to Vercel (Recommended)

1. Create **new Vercel project** for backend
2. **Root Directory:** `backend`
3. **Build Command:** `npm run build`
4. **Output Directory:** `dist`
5. **Install Command:** `npm install`

**Backend Environment Variables:**
```
FIREBASE_PROJECT_ID=cognifa-app
FRONTEND_URL=https://your-frontend-url.vercel.app
PORT=5000
```

**For Vercel Serverless:**
Since service account keys are restricted, you have two options:

**Option 1: Use Environment Variables (if you can get them)**
Ask your organization admin for:
- Service account email
- Private key

Then add:
```
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@cognifa-app.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**Option 2: Use Vercel's Service Account (if available)**
Some organizations allow creating service accounts through Vercel's integration.

### Option B: Deploy Backend to Railway/Render

1. Go to: https://railway.app or https://render.com
2. Connect GitHub repository
3. **Root Directory:** `backend`
4. **Build Command:** `npm run build`
5. **Start Command:** `npm start`
6. Add environment variables (same as above)

### Option C: Keep Backend Local (Development Only)

For local development, backend can stay local:
- Backend runs on: `http://localhost:5000`
- Frontend on Vercel uses: `NEXT_PUBLIC_API_URL=http://localhost:5000` (only works for local testing)

---

## Part 4: Update Frontend API URL

After backend is deployed:

1. Go to Vercel dashboard → Frontend project
2. **Settings** → **Environment Variables**
3. Update `NEXT_PUBLIC_API_URL` to your backend URL:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend.vercel.app
   ```
4. **Redeploy** frontend

---

## Part 5: Verify Everything Works

### 1. Test Frontend
- Visit your Vercel frontend URL
- Should see login page
- Check browser console (F12) - no Firebase errors

### 2. Test Authentication
- Try to create an account
- Check Firebase Console → Authentication
- User should appear

### 3. Test Firestore
- Check Firebase Console → Firestore Database
- Should see `users` collection after creating user

### 4. Test Storage
- Try uploading a file
- Check Firebase Console → Storage
- File should appear

---

## Quick Reference

### Local Development Commands

```powershell
# Backend
cd backend
npm run dev

# Frontend (new terminal)
cd frontend
npm run dev
```

### Deploy Security Rules

```powershell
firebase deploy --only firestore:rules,storage:rules
```

### Check ADC Status

```powershell
gcloud auth application-default print-access-token
```

If this works, ADC is set up correctly!

---

## Troubleshooting

### "Firebase Admin not initialized"
- Run: `gcloud auth application-default login`
- Verify: `gcloud config get-value project` shows `cognifa-app`
- Check: `backend/.env` has `FIREBASE_PROJECT_ID=cognifa-app`

### "Permission denied" in Firestore
- Deploy rules: `firebase deploy --only firestore:rules`
- Check rules syntax in `firestore.rules`

### "Build fails" on Vercel
- Check root directory is `.` (not `frontend`)
- Verify `prebuild` script in `frontend/package.json`
- Check build logs in Vercel dashboard

### "CORS errors"
- Add frontend URL to backend CORS allowed origins
- Update `FRONTEND_URL` in backend environment variables

### "Environment variables not working"
- Ensure `NEXT_PUBLIC_` prefix for frontend variables
- Redeploy after adding variables
- Check variable names are exact (case-sensitive)

---

## Next Steps

1. ✅ Firebase project created
2. ✅ ADC set up locally
3. ✅ Security rules deployed
4. ✅ Frontend deployed to Vercel
5. ✅ Backend deployed
6. ⏭️ Test authentication
7. ⏭️ Migrate existing data (if needed)
8. ⏭️ Set up custom domain (optional)

---

## Summary

**What we did:**
- ✅ Used ADC instead of service account key (works with restricted org policies)
- ✅ Set up Firebase locally with `gcloud auth application-default login`
- ✅ Deployed frontend to Vercel with Firebase client config
- ✅ Configured backend for deployment

**Key files:**
- `backend/.env` - Has `FIREBASE_PROJECT_ID=cognifa-app`
- `firestore.rules` - Security rules (already deployed)
- `storage.rules` - Storage rules (already deployed)
- `vercel.json` - Vercel configuration

You're all set! 🎉
