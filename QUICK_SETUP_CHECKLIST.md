# ✅ Firebase + Vercel Quick Checklist

## Firebase Setup (15 min)

- [ ] Install Google Cloud SDK
- [ ] Run: `gcloud auth login`
- [ ] Run: `gcloud auth application-default login`
- [ ] Run: `gcloud config set project cognifa-16209`
- [ ] Get Firebase client config from console
- [ ] Deploy security rules: `firebase deploy --only firestore:rules,storage:rules`
- [ ] Test backend: `cd backend && npm run dev` (should see ✅ Firebase Admin initialized)

## Vercel Frontend Setup (10 min)

- [ ] Create Vercel account
- [ ] Connect GitHub repository
- [ ] Set root directory: `.`
- [ ] Set build command: `cd frontend && npm run build`
- [ ] Set output directory: `frontend/.next`
- [ ] Add environment variables:
  - [ ] `NEXT_PUBLIC_FIREBASE_API_KEY`
  - [ ] `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
  - [ ] `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
  - [ ] `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
  - [ ] `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
  - [ ] `NEXT_PUBLIC_FIREBASE_APP_ID`
  - [ ] `NEXT_PUBLIC_API_URL` (after backend is deployed)
- [ ] Deploy frontend
- [ ] Copy frontend URL

## Vercel Backend Setup (10 min)

- [ ] Create new Vercel project for backend
- [ ] Set root directory: `backend`
- [ ] Set build command: `npm run build`
- [ ] Set output directory: `dist`
- [ ] Add environment variables:
  - [ ] `FIREBASE_PROJECT_ID=cognifa-16209`
  - [ ] `FIREBASE_SERVICE_ACCOUNT_PATH=./cognifa-16209-firebase-adminsdk-fbsvc-a28e32f3ab.json`
  - [ ] `FRONTEND_URL` (your frontend Vercel URL)
- [ ] Deploy backend
- [ ] Copy backend URL

## Final Steps (5 min)

- [ ] Update `NEXT_PUBLIC_API_URL` in frontend with backend URL
- [ ] Redeploy frontend
- [ ] Test login page
- [ ] Test user creation
- [ ] Verify in Firebase Console

## Your Project Info

- **Firebase Project ID:** `cognifa-16209`
- **Project Number:** `760299044391`
- **Project Number:** `402405414048`
- **Organization:** `cognifa-id-org`

## Quick Commands

```powershell
# Setup ADC
gcloud auth application-default login
gcloud config set project cognifa-16209

# Deploy rules
firebase deploy --only firestore:rules,storage:rules

# Test locally
cd backend && npm run dev
cd frontend && npm run dev
```

---

**Full guide:** See `SETUP_FIREBASE_VERCEL_NOW.md`
