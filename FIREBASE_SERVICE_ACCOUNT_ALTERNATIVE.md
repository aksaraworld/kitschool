# 🔑 Firebase Service Account - Alternative Setup

## Problem
"Key creation is not allowed on this service account" - This happens when:
- Organization policies restrict service account key creation
- Your account doesn't have permission to create keys
- Security policies are in place

## ✅ Solution: Use Environment Variables Instead

Instead of downloading a service account key file, use environment variables directly.

### Step 1: Get Service Account Credentials

1. Go to Firebase Console → Project Settings → Service Accounts
2. You'll see the service account email (e.g., `firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com`)
3. **Note:** You can't download the key, but you can use the service account email

### Step 2: Create Service Account Key via Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your Firebase project
3. Go to **IAM & Admin** → **Service Accounts**
4. Find your Firebase service account (starts with `firebase-adminsdk-`)
5. Click on it → **Keys** tab
6. Click **Add Key** → **Create new key**
7. If this also fails, use the alternative method below

### Step 3: Alternative - Use Application Default Credentials (ADC)

If you can't create keys, use Application Default Credentials:

#### Option A: Use gcloud CLI (Recommended)

```bash
# Install gcloud CLI
# Windows: Download from https://cloud.google.com/sdk/docs/install
# Mac: brew install google-cloud-sdk
# Linux: Follow official docs

# Login
gcloud auth login

# Set application default credentials
gcloud auth application-default login

# Set project
gcloud config set project YOUR_PROJECT_ID
```

Then update `backend/src/config/firebase.ts` to use ADC:

```typescript
import admin from 'firebase-admin';

// Use Application Default Credentials
admin.initializeApp({
  projectId: process.env.FIREBASE_PROJECT_ID,
});
```

#### Option B: Use Environment Variables (Manual Setup)

If you have access to the private key from another source, use environment variables:

**Backend .env:**
```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
```

**Important:** 
- The private key must be on a single line with `\n` for newlines
- Wrap in quotes
- Keep it secure!

### Step 4: Update Firebase Config

The current config already supports environment variables! Just set:

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

The code in `backend/src/config/firebase.ts` will automatically use these.

## 🔧 Alternative: Use Firebase Client SDK Only (Frontend Only)

If you can't use Firebase Admin SDK, you can:

1. **Use Firebase Client SDK for all operations**
2. **Use Cloud Functions** for server-side operations
3. **Use Firebase Extensions** for common operations

### Update Backend to Use Client SDK

Create `backend/src/config/firebaseClient.ts`:

```typescript
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const app = getApps().length === 0 
  ? initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID,
      // Use environment variables
      credential: process.env.FIREBASE_PRIVATE_KEY 
        ? cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
          })
        : undefined
    })
  : getApps()[0];

export const firestore = getFirestore(app);
export const auth = getAuth(app);
```

## 🚀 Quick Fix: Contact Admin

If you're in an organization:

1. **Contact your Google Cloud admin** to:
   - Request permission to create service account keys
   - Or request a service account key to be created for you
   - Or get the private key from an existing service account

2. **Request policy exception** if needed:
   - Explain you need it for Firebase Admin SDK
   - Provide use case (backend authentication)

## ✅ Recommended Solution

**Use Application Default Credentials (ADC) with gcloud:**

```bash
# Install gcloud
# Login
gcloud auth application-default login

# Your code will automatically use ADC
# No service account key file needed!
```

Then your Firebase config will work without a key file.

## 📝 Update Code for ADC

If using ADC, update `backend/src/config/firebase.ts`:

```typescript
import { initializeFirebaseAdmin } from '@aksara/firebase';

// Use ADC - no credentials needed
const initResult = initializeFirebaseAdmin({
  projectId: process.env.FIREBASE_PROJECT_ID || '',
  // No serviceAccountPath or serviceAccount needed
  // Will use Application Default Credentials
});
```

## 🎯 Summary

**Best Options:**
1. ✅ Use `gcloud auth application-default login` (easiest)
2. ✅ Use environment variables with private key (if you can get it)
3. ✅ Contact admin for service account key
4. ✅ Use Firebase Client SDK only (limited functionality)

**Current Code Support:**
- ✅ Already supports environment variables
- ✅ Already supports service account file
- ⚠️ Need to add ADC support (optional)

Choose the option that works for your situation!
