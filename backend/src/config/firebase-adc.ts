/**
 * Firebase Admin SDK with Application Default Credentials (ADC)
 * Use this when service account key creation is restricted
 * 
 * Setup: gcloud auth application-default login
 */

import admin, { App } from 'firebase-admin';
import { FirebaseAdminInitResult } from '@aksara/firebase/types';

let isInitialized = false;
let adminApp: App | null = null;
let authAvailable = false;

/**
 * Initialize Firebase Admin using Application Default Credentials
 * No service account key file needed!
 */
export function initializeFirebaseAdminADC(projectId: string): FirebaseAdminInitResult {
  if (isInitialized || admin.apps.length > 0) {
    return {
      initialized: true,
      authAvailable
    };
  }

  try {
    // Use Application Default Credentials
    // Requires: gcloud auth application-default login
    adminApp = admin.initializeApp({
      projectId: projectId,
      // No credential specified = uses ADC
    });
    
    authAvailable = true;
    isInitialized = true;
    
    console.log('✅ Firebase Admin initialized with Application Default Credentials');
    
    return {
      initialized: true,
      authAvailable: true
    };
  } catch (error) {
    console.error('Firebase Admin ADC initialization error:', error);
    return {
      initialized: false,
      authAvailable: false,
      error: error as Error
    };
  }
}

/**
 * Get Firebase Admin app
 */
export function getFirebaseAdminApp(): App {
  if (!adminApp) {
    throw new Error('Firebase Admin not initialized. Call initializeFirebaseAdminADC first.');
  }
  return adminApp;
}

/**
 * Get Firebase Admin Firestore
 */
export function getFirebaseAdminDb() {
  return admin.firestore();
}

/**
 * Get Firebase Admin Auth
 */
export function getFirebaseAdminAuth() {
  return admin.auth();
}

/**
 * Verify Firebase ID token
 */
export async function verifyIdToken(token: string): Promise<admin.auth.DecodedIdToken | null> {
  try {
    const auth = getFirebaseAdminAuth();
    const decodedToken = await auth.verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}
