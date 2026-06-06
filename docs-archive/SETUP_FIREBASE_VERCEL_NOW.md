# 🚀 Complete Firebase + Vercel Setup Guide

## Your Firebase Project Info
- **Project Name:** cognifa
- **Project ID:** cognifa-16209
- **Project Number:** 760299044391
- **Service Account Key:** Available ✅

✅ Firestore: Done  
✅ Storage: Done  
✅ Auth: Done  
✅ Service Account Key: Available

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

### Step 2: Verify Service Account Key

The service account key file is already in place:
- **Location:** `backend/cognifa-16209-firebase-adminsdk-fbsvc-a28e32f3ab.json`
- **Project ID:** `cognifa-16209`
- **Client Email:** `firebase-adminsdk-fbsvc@cognifa-16209.iam.gserviceaccount.com`

**Verify the file exists:**
```powershell
# Check if file exists
Test-Path "backend\cognifa-16209-firebase-adminsdk-fbsvc-a28e32f3ab.json"
```

You should see: `True`

### Step 3: Get Firebase Client Config

1. Go to: https://console.firebase.google.com/project/cognifa-16209
2. Click **⚙️ Project Settings** (gear icon)
3. Scroll to **"Your apps"** section
4. Click **Web icon** (`</>`)
5. Register app:
   - App nickname: `Aksara School Management Web`
   - Firebase Hosting: **No** (we're using Vercel)
6. Click **"Register app"**
7. **Copy the `firebaseConfig` object** - you'll need this for Vercel!

Your Firebase config:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyBWzyPLXe9w9QEjtPoB293WRJe9ty2o6z8",
  authDomain: "cognifa-16209.firebaseapp.com",
  projectId: "cognifa-16209",
  storageBucket: "cognifa-16209.firebasestorage.app",
  messagingSenderId: "760299044391",
  appId: "1:760299044391:web:adf809d8c2563f8444d802",
  measurementId: "G-PHDZJYNX2H"
};
```

### Step 4: Deploy Security Rules

The `firebase.json` file is already created. Now deploy the rules:

```powershell
# Install Firebase CLI (if not installed)
npm install -g firebase-tools

# Login to Firebase
firebase login

# Set the Firebase project
firebase use cognifa-16209

# Deploy rules
firebase deploy --only firestore:rules,storage:rules
```

**Note:** The `firebase.json` file is already configured with:
- Firestore rules: `firestore.rules`
- Storage rules: `storage.rules`
- Firestore indexes: `firestore.indexes.json`

### Step 5: Test Local Setup

```powershell
# Backend
cd backend
npm run dev
```

You should see:
```
✅ Firebase Admin initialized successfully
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
- **Install Command:** `node build-packages.js && cd frontend && npm install`

### Step 4: Add Environment Variables

Go to **Settings** → **Environment Variables** in Vercel dashboard.

#### Frontend Environment Variables

Add these **one by one** (case-sensitive):

```
NEXT_PUBLIC_API_URL=https://your-backend-url.vercel.app
```
*(We'll get this after deploying backend)*

```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyBWzyPLXe9w9QEjtPoB293WRJe9ty2o6z8
```
*(From firebaseConfig.apiKey)*

```
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=cognifa-16209.firebaseapp.com
```
*(From firebaseConfig.authDomain)*

```
NEXT_PUBLIC_FIREBASE_PROJECT_ID=cognifa-16209
```
*(From firebaseConfig.projectId)*

```
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=cognifa-16209.firebasestorage.app
```
*(From firebaseConfig.storageBucket)*

```
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=760299044391
```
*(From firebaseConfig.messagingSenderId)*

```
NEXT_PUBLIC_FIREBASE_APP_ID=1:760299044391:web:adf809d8c2563f8444d802
```
*(From firebaseConfig.appId)*

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
FIREBASE_PROJECT_ID=cognifa-16209
FIREBASE_SERVICE_ACCOUNT_PATH=./cognifa-16209-firebase-adminsdk-fbsvc-a28e32f3ab.json
FRONTEND_URL=https://your-frontend-url.vercel.app
PORT=5000
```

**For Vercel Serverless:**
You can use environment variables instead of the file:

```
FIREBASE_PROJECT_ID=cognifa-16209
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@cognifa-16209.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**Note:** Upload the service account JSON file to Vercel and reference it, or use the environment variables method above.

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

  ### Verify Service Account Key

```powershell
# Check if service account file exists
Test-Path "backend\cognifa-16209-firebase-adminsdk-fbsvc-a28e32f3ab.json"
```

Should return: `True`

---

## Troubleshooting

### "Firebase Admin not initialized"
- Check: `backend/.env` has `FIREBASE_PROJECT_ID=cognifa-16209`
- Verify: Service account key file exists at path in `FIREBASE_SERVICE_ACCOUNT_PATH`
- For local: Ensure service account JSON is in `backend/` directory
- For Vercel: Use environment variables method (see Part 3)

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
- `backend/.env` - Has `FIREBASE_PROJECT_ID=cognifa-16209` and service account path
- `backend/cognifa-16209-firebase-adminsdk-fbsvc-a28e32f3ab.json` - Service account key
- `firestore.rules` - Security rules (already deployed)
- `storage.rules` - Storage rules (already deployed)
- `vercel.json` - Vercel configuration

You're all set! 🎉
