/**
 * Firebase Client SDK Configuration
 * Initialize Firebase Client for frontend operations
 */

'use client';

// Import only client-side Firebase (not admin)
// Using direct import to avoid bundling firebase-admin
import { initializeFirebaseClient, getFirebaseConfigFromEnv } from '@aksara/firebase';

// Get Firebase config from environment variables
const firebaseConfig = getFirebaseConfigFromEnv();

// Only initialize if we have required config (during build, env vars might not be available)
let app: any = null;
let auth: any = null;
let db: any = null;
let storage: any = null;

if (firebaseConfig.apiKey && firebaseConfig.projectId) {
  try {
    const firebase = initializeFirebaseClient(firebaseConfig);
    app = firebase.app;
    auth = firebase.auth;
    db = firebase.db;
    storage = firebase.storage;
  } catch (error) {
    console.warn('Firebase initialization failed (this is OK during build):', error);
  }
}

export { app, auth, db, storage };

// Export Firebase services
export default {
  app,
  auth,
  db,
  storage
};
