# @aksara/firebase

Firebase integration utilities for Aksara Framework with support for both client-side and Admin SDK.

## Features

- ✅ Firebase client initialization (Auth, Firestore, Storage)
- ✅ Firebase Admin SDK initialization
- ✅ Multiple credential sources (file, object, environment variables)
- ✅ Token verification utilities
- ✅ Type-safe configuration

## Installation

```bash
npm install @aksara/firebase firebase firebase-admin
```

## Usage

### Client-Side Firebase

```typescript
import { initializeFirebaseClient, getFirebaseConfigFromEnv } from '@aksara/firebase/client';

// From environment variables
const config = getFirebaseConfigFromEnv();
const { app, auth, db, storage } = initializeFirebaseClient(config);

// Or with custom config
const { app, auth, db, storage } = initializeFirebaseClient({
  apiKey: 'your-api-key',
  authDomain: 'your-project.firebaseapp.com',
  projectId: 'your-project-id',
  storageBucket: 'your-project.appspot.com',
  messagingSenderId: 'your-sender-id',
  appId: 'your-app-id'
});
```

### Firebase Admin SDK

```typescript
import { 
  initializeFirebaseAdmin, 
  getFirebaseAdminDb, 
  getFirebaseAdminAuth,
  verifyIdToken 
} from '@aksara/firebase/admin';

// Initialize with service account file
const result = initializeFirebaseAdmin({
  projectId: 'your-project-id',
  serviceAccountPath: './serviceAccountKey.json'
});

if (result.initialized) {
  const db = getFirebaseAdminDb();
  const auth = getFirebaseAdminAuth();
  
  // Use Firebase Admin services
}

// Initialize from environment variables
const result = initializeFirebaseAdminFromEnv('your-project-id');

// Verify ID token
const decodedToken = await verifyIdToken(idToken);
```

## Serverless / Next.js note (important)

- **Never import `firebase-admin` from client code** (it pulls Node-only modules like `fs`, `net`, `tls`).
- Use explicit subpath imports:
  - **Client**: `@aksara/firebase/client`
  - **Admin**: `@aksara/firebase/admin`

This makes the package safe for **Next.js + Vercel (serverless)** and avoids bundling admin SDK into the browser.

## Express middleware (server-only)

If you run an Express API (Cloud Run, VM, etc), you can reuse a tiny auth layer:

```ts
import { firebaseAuthenticate, firebaseAuthorize } from '@aksara/firebase/express';

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.get('/api/private', firebaseAuthenticate(), (req, res) => res.json({ uid: req.user?.uid }));

app.get('/api/admin', firebaseAuthenticate(), firebaseAuthorize('saas_admin'), (req, res) => res.json({ ok: true }));
```

## Firebase-only backend (no Mongo required)

The Aksara + Firebase stack works with **Firestore as the primary database** and **Firebase Auth as identity**.
If you’re migrating from Mongo/Mongoose, treat that as a legacy persistence layer—your runtime backend can be entirely Firebase-admin powered.

### Environment Variables

```env
# Client-side (NEXT_PUBLIC_*)
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# Admin SDK
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json
```

## Types

```typescript
interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

interface FirebaseAdminOptions {
  projectId: string;
  serviceAccountPath?: string;
  serviceAccount?: {
    project_id: string;
    private_key: string;
    client_email: string;
  };
  storageBucket?: string;
  credential?: {
    projectId: string;
    clientEmail: string;
    privateKey: string;
  };
}
```

## License

Proprietary - Copyright (c) 2025 Panji Tianda (panjitianda@gmail.com) - In behalf of Aksara Nirwana Tianda. All rights reserved.
