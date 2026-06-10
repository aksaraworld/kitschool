/**
 * Firebase Client SDK — single firebase package instance for browser.
 */

'use client';

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { getFirebaseConfigFromEnv } from '@aksara/firebase/client';

const firebaseConfig = getFirebaseConfigFromEnv();

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

if (firebaseConfig.apiKey && firebaseConfig.projectId) {
  try {
    app = getApps().length > 0 ? getApps()[0]! : initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    if (typeof window !== 'undefined') {
      try {
        if (
          window.isSecureContext ||
          window.location.hostname === 'localhost' ||
          window.location.hostname.includes('vercel.app')
        ) {
          storage = getStorage(app);
        }
      } catch {
        storage = null;
      }
    }
  } catch (error) {
    console.warn('Firebase initialization failed:', error);
  }
}

export { app, auth, db, storage };

export default { app, auth, db, storage };
