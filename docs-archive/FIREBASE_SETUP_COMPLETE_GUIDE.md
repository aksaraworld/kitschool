# 🔥 Complete Firebase Setup Guide

## Step 1: Create Firebase Project

1. Go to https://console.firebase.google.com
2. Click **"Add project"** or **"Create a project"**
3. Enter project name: `cognifa` (or your choice)
4. (Optional) Enable Google Analytics
5. Click **"Create project"**
6. Wait for project creation (30-60 seconds)
7. Click **"Continue"**

## Step 2: Enable Firebase Services

### 2.1 Enable Authentication

1. In Firebase Console, go to **Authentication**
2. Click **"Get started"** or **"Enable"**
3. Go to **Sign-in method** tab
4. Click on **Email/Password**
5. Toggle **Enable** to ON
6. Click **Save**

**Optional:** Enable other providers (Google, etc.) if needed.

### 2.2 Create Firestore Database

1. Go to **Firestore Database**
2. Click **"Create database"**
3. Select **"Start in production mode"** (we'll add rules later)
4. Choose a location (closest to your users):
   - **asia-southeast2** (Jakarta) - Recommended for Indonesia
   - **us-central1** (Iowa) - Good default
5. Click **"Enable"**
6. Wait for database creation

### 2.3 Enable Storage

1. Go to **Storage**
2. Click **"Get started"**
3. Select **"Start in production mode"** (we'll add rules later)
4. Choose same location as Firestore
5. Click **"Done"**

## Step 3: Get Service Account Key (Backend)

1. Go to **Project Settings** (gear icon)
2. Go to **Service accounts** tab
3. Click **"Generate new private key"**
4. Click **"Generate key"** in the popup
5. A JSON file will download - **SAVE THIS SECURELY!**
6. Rename it to `firebase-service-account.json`
7. Place it in `backend/` directory
8. **Add to .gitignore** (already done)

## Step 4: Get Client Config (Frontend)

1. In **Project Settings** > **General** tab
2. Scroll to **"Your apps"** section
3. Click the **Web icon** (`</>`)
4. Register app:
   - App nickname: `Aksara School Management Web`
   - (Optional) Firebase Hosting: No
5. Click **"Register app"**
6. Copy the `firebaseConfig` object

It looks like:
```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

## Step 5: Configure Environment Variables

### Backend (.env)

Create `backend/.env`:

```env
# Firebase Admin
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json

# Or use environment variables instead:
# FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
# FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# MongoDB (for migration, can remove after)
MONGODB_URI=mongodb://localhost:27017/sekolahkita

# Server
PORT=5000
FRONTEND_URL=http://localhost:3000
```

### Frontend (.env.local)

Create `frontend/.env.local`:

```env
# API
NEXT_PUBLIC_API_URL=http://localhost:5000

# Firebase Client Config
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

## Step 6: Deploy Security Rules

### 6.1 Install Firebase CLI

```bash
npm install -g firebase-tools
```

### 6.2 Login to Firebase

```bash
firebase login
```

### 6.3 Initialize Firebase in Project

```bash
# From project root
firebase init
```

Select:
- ✅ Firestore
- ✅ Storage
- Use existing project → Select your project
- Firestore rules file: `firestore.rules` (already created)
- Firestore indexes: `firestore.indexes.json` (create if needed)
- Storage rules file: `storage.rules` (already created)

### 6.4 Deploy Rules

```bash
firebase deploy --only firestore:rules,storage:rules
```

## Step 7: Test Firebase Connection

### Backend Test

```bash
cd backend
npm run dev
```

You should see:
```
✅ Firebase Admin initialized successfully
```

### Frontend Test

```bash
cd frontend
npm run dev
```

Open browser console - no Firebase errors should appear.

## Step 8: Migrate Existing Data (Optional)

If you have existing MongoDB data:

```bash
cd backend
npm run migrate:firebase
```

**Important:** Users will need to reset passwords as original passwords cannot be migrated.

## Step 9: Verify Setup

1. **Test Authentication:**
   - Go to login page
   - Try to login (will fail if no users)
   - Create a test user via API

2. **Test Firestore:**
   - Check Firebase Console > Firestore Database
   - Should see `users` collection after creating a user

3. **Test Storage:**
   - Upload a file via frontend
   - Check Firebase Console > Storage
   - File should appear

## Step 10: Production Setup

### Environment Variables in Production

**Backend (Vercel/Railway/etc.):**
- Set `FIREBASE_PROJECT_ID`
- Set `FIREBASE_SERVICE_ACCOUNT_PATH` OR
- Set `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY`

**Frontend (Vercel):**
- Set all `NEXT_PUBLIC_FIREBASE_*` variables
- Set `NEXT_PUBLIC_API_URL` to your backend URL

## Troubleshooting

### "Firebase Admin not initialized"
- Check service account file path
- Verify environment variables
- Check file permissions

### "Permission denied" in Firestore
- Deploy security rules: `firebase deploy --only firestore:rules`
- Check rules syntax
- Verify user has correct role

### "Storage not available"
- Check Storage is enabled in Firebase Console
- Verify security rules: `firebase deploy --only storage:rules`
- Check browser console for errors

### "Invalid token"
- Verify Firebase config in frontend
- Check token expiration
- Verify custom claims are set

## Next Steps

1. ✅ Firebase project created
2. ✅ Services enabled
3. ✅ Environment variables configured
4. ✅ Security rules deployed
5. ✅ Test connection
6. ⏭️ Start using Firebase Auth
7. ⏭️ Migrate routes to Firestore
8. ⏭️ Use Firebase Storage

## Resources

- [Firebase Console](https://console.firebase.google.com)
- [Firebase Auth Docs](https://firebase.google.com/docs/auth)
- [Firestore Docs](https://firebase.google.com/docs/firestore)
- [Storage Docs](https://firebase.google.com/docs/storage)
