/**
 * Copyright (c) 2025 Panji Tianda (panjitianda@gmail.com) - In behalf of Aksara Nirwana Tianda. All rights reserved.
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { FirebaseClientConfig } from './types';

// Re-export types for convenience
export type { FirebaseClientConfig } from './types';

/**
 * Initialize Firebase client
 */
export function initializeFirebaseClient(config: FirebaseClientConfig): {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  storage: FirebaseStorage | null;
} {
  let app: FirebaseApp;

  // Check if Firebase is already initialized
  if (getApps().length === 0) {
    app = initializeApp(config);
  } else {
    app = getApps()[0];
  }

  const auth = getAuth(app);
  const db = getFirestore(app);

  // Initialize storage only on client side
  let storage: FirebaseStorage | null = null;
  if (typeof window !== 'undefined') {
    try {
      // Check if we're in a secure context
      if (window.isSecureContext || 
          window.location.hostname === 'localhost' || 
          window.location.hostname.includes('vercel.app')) {
        storage = getStorage(app);
      }
    } catch (error) {
      console.warn('Firebase storage not available:', error);
      storage = null;
    }
  }

  return { app, auth, db, storage };
}

/**
 * Get Firebase client config from environment variables
 */
export function getFirebaseConfigFromEnv(): FirebaseClientConfig {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
  };
}
