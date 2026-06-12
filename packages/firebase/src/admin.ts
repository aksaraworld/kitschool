/**
 * Copyright (c) 2025 Panji Tianda (panjitianda@gmail.com) - In behalf of Aksara Nirwana Tianda. All rights reserved.
 */

import admin from 'firebase-admin';
import type { app } from 'firebase-admin';
import path from 'path';
import fs from 'fs';
import { FirebaseAdminOptions, FirebaseAdminInitResult } from './types';

let isInitialized = false;
let adminApp: app.App | null = null;
let authAvailable = false;

/**
 * Initialize Firebase Admin SDK
 */
export function initializeFirebaseAdmin(options: FirebaseAdminOptions): FirebaseAdminInitResult {
  if (isInitialized || admin.apps.length > 0) {
    if (!adminApp && admin.apps.length > 0) {
      adminApp = admin.apps[0]!;
      authAvailable = true;
      isInitialized = true;
    }
    return {
      initialized: true,
      authAvailable,
    };
  }

  try {
    // Try service account file first
    if (options.serviceAccountPath) {
      const serviceAccountPath = path.isAbsolute(options.serviceAccountPath)
        ? options.serviceAccountPath
        : path.join(process.cwd(), options.serviceAccountPath);

      if (fs.existsSync(serviceAccountPath)) {
        const serviceAccountJson = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        
        // Convert to firebase-admin format if needed
        const serviceAccount = serviceAccountJson.projectId 
          ? serviceAccountJson 
          : {
              projectId: serviceAccountJson.project_id,
              clientEmail: serviceAccountJson.client_email,
              privateKey: serviceAccountJson.private_key?.replace(/\\n/g, '\n') || serviceAccountJson.private_key
            };
        
        adminApp = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: serviceAccount.projectId || serviceAccountJson.project_id || options.projectId,
          storageBucket: options.storageBucket || `${serviceAccount.projectId || serviceAccountJson.project_id || options.projectId}.firebasestorage.app`
        });
        
        authAvailable = true;
        isInitialized = true;
        
        return {
          initialized: true,
          authAvailable: true
        };
      }
    }

    // Try service account object
    if (options.serviceAccount) {
      adminApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: options.serviceAccount.project_id,
          clientEmail: options.serviceAccount.client_email,
          privateKey: options.serviceAccount.private_key?.replace(/\\n/g, '\n') || options.serviceAccount.private_key
        }),
        projectId: options.serviceAccount.project_id || options.projectId,
        storageBucket: options.storageBucket || `${options.serviceAccount.project_id || options.projectId}.firebasestorage.app`
      });
      
      authAvailable = true;
      isInitialized = true;
      
      return {
        initialized: true,
        authAvailable: true
      };
    }

    // Try credential object
    if (options.credential) {
      adminApp = admin.initializeApp({
        credential: admin.credential.cert(options.credential),
        projectId: options.projectId,
        storageBucket: options.storageBucket || `${options.projectId}.firebasestorage.app`
      });
      
      authAvailable = true;
      isInitialized = true;
      
      return {
        initialized: true,
        authAvailable: true
      };
    }

    // Try environment variables
    const projectId = process.env.FIREBASE_PROJECT_ID || options.projectId;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (projectId && clientEmail && privateKey) {
      adminApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
        storageBucket: options.storageBucket || `${projectId}.firebasestorage.app`,
      });

      authAvailable = true;
      isInitialized = true;

      return {
        initialized: true,
        authAvailable: true,
      };
    }

    // Application Default Credentials (local: gcloud auth application-default login)
    if (projectId) {
      try {
        adminApp = admin.initializeApp({
          projectId,
          storageBucket: options.storageBucket || `${projectId}.firebasestorage.app`,
        });
        authAvailable = true;
        isInitialized = true;
        if (process.env.NODE_ENV !== 'production') {
          console.log('Firebase Admin: using Application Default Credentials');
        }
        return {
          initialized: true,
          authAvailable: true,
        };
      } catch {
        // fall through to failure below
      }
    }

    const err = new Error('No Firebase credentials found');
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        'Firebase Admin not initialized. Set FIREBASE_SERVICE_ACCOUNT_PATH, FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY, or run: gcloud auth application-default login'
      );
    }
    return {
      initialized: false,
      authAvailable: false,
      error: err,
    };
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
    return {
      initialized: false,
      authAvailable: false,
      error: error as Error,
    };
  }
}

/**
 * Get Firebase Admin from environment variables
 */
export function initializeFirebaseAdminFromEnv(projectId?: string): FirebaseAdminInitResult {
  return initializeFirebaseAdmin({
    projectId: projectId || process.env.FIREBASE_PROJECT_ID || '',
    serviceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH
  });
}

/**
 * Get initialized Firebase Admin app
 */
export function getFirebaseAdminApp(): app.App {
  if (adminApp) return adminApp;
  if (admin.apps.length > 0) return admin.apps[0]!;
  throw new Error('Firebase Admin not initialized. Call initializeFirebaseAdmin first.');
}

/**
 * Get Firebase Admin Firestore instance
 */
export function getFirebaseAdminDb() {
  return admin.firestore();
}

/**
 * Get Firebase Admin Auth instance
 */
export function getFirebaseAdminAuth() {
  return admin.auth();
}

/**
 * Get Firebase Admin Messaging instance (FCM push)
 */
export function getFirebaseAdminMessaging() {
  return getFirebaseAdminApp().messaging();
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
