/**
 * Firebase Admin SDK Configuration
 * Initialize Firebase Admin for backend operations
 * 
 * Supports multiple authentication methods:
 * 1. Service account key file (FIREBASE_SERVICE_ACCOUNT_PATH)
 * 2. Environment variables (FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY)
 * 3. Application Default Credentials (gcloud auth application-default login)
 */

// Ensure env vars are loaded BEFORE initializing Firebase Admin.
// (In ESM/tsx, imports are evaluated before module body in importers,
// so relying on `dotenv.config()` in server.ts is fragile.)
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Try a few common locations so running from repo root or /backend both work.
const envCandidates = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'backend', '.env'),
  path.resolve(__dirname, '../../.env'),
];
for (const p of envCandidates) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    break;
  }
}

// IMPORTANT: import admin helpers from the server-only entrypoint.
// `@aksara/firebase` default export is client-only to keep Next.js from bundling firebase-admin.
// Import from the exported admin entrypoint (works with Node package exports at runtime).
import { initializeFirebaseAdminFromEnv, getFirebaseAdminAuth, getFirebaseAdminDb } from '@aksara/firebase/admin';
import admin from 'firebase-admin';

// Initialize Firebase Admin
let initResult: any;
try {
  // Try standard initialization first
  initResult = initializeFirebaseAdminFromEnv();
  
  if (!initResult.initialized) {
    // Fallback: Try Application Default Credentials (ADC)
    // This works when service account key creation is restricted
    const projectId = process.env.FIREBASE_PROJECT_ID;
    if (projectId && admin.apps.length === 0) {
      try {
        admin.initializeApp({
          projectId: projectId,
          // No credential = uses Application Default Credentials
        });
        console.log('✅ Firebase Admin initialized with Application Default Credentials');
        console.log('   (Using: gcloud auth application-default login)');
        initResult = { initialized: true, authAvailable: true };
      } catch (adcError) {
        console.warn('⚠️  Firebase Admin not initialized. Some features may not work.');
        console.warn('   Options:');
        console.warn('   1. Set FIREBASE_PROJECT_ID and FIREBASE_SERVICE_ACCOUNT_PATH in .env');
        console.warn('   2. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY');
        console.warn('   3. Run: gcloud auth application-default login');
        initResult = { initialized: false, authAvailable: false };
      }
    } else {
      console.warn('⚠️  Firebase Admin not initialized. Some features may not work.');
      console.warn('   Set FIREBASE_PROJECT_ID and FIREBASE_SERVICE_ACCOUNT_PATH in .env');
    }
  } else {
    console.log('✅ Firebase Admin initialized successfully');
  }
  
  if (!initResult.authAvailable && initResult.initialized) {
    console.warn('⚠️  Firebase Auth not available');
  }
} catch (error) {
  console.warn('⚠️  Firebase Admin initialization failed:', error);
  console.warn('   Continuing without Firebase. Set up Firebase to enable Firebase features.');
  initResult = { initialized: false, authAvailable: false };
}

// Export Firebase services (with fallback to direct admin access)
let firebaseAuth: any;
let firestore: any;

try {
  firebaseAuth = getFirebaseAdminAuth();
  firestore = getFirebaseAdminDb();
} catch (error) {
  // Fallback: Use admin directly if getters fail
  if (admin.apps.length > 0) {
    firebaseAuth = admin.auth();
    firestore = admin.firestore();
  } else {
    console.warn('⚠️  Firebase Admin services not available');
  }
}

export { firebaseAuth, firestore };

// Helper to verify Firebase ID token
export async function verifyFirebaseToken(idToken: string) {
  try {
    const decodedToken = await firebaseAuth.verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

// Helper to get user by UID
export async function getFirebaseUser(uid: string) {
  try {
    const userRecord = await firebaseAuth.getUser(uid);
    return userRecord;
  } catch (error) {
    console.error('Error getting Firebase user:', error);
    return null;
  }
}

// Helper to create custom claims (for roles)
export async function setUserRole(uid: string, role: string, schoolId?: string) {
  try {
    const customClaims: any = { role };
    if (schoolId) {
      customClaims.schoolId = schoolId;
    }
    await firebaseAuth.setCustomUserClaims(uid, customClaims);
    return true;
  } catch (error) {
    console.error('Error setting user role:', error);
    return false;
  }
}
