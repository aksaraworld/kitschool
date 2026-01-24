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
import { initializeFirebaseClient, getFirebaseConfigFromEnv } from '@aksara/firebase';

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
} from '@aksara/firebase';

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
