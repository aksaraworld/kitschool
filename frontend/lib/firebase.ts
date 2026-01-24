/**
 * Firebase Client SDK Configuration
 * Initialize Firebase Client for frontend operations
 */

'use client';

import { initializeFirebaseClient, getFirebaseConfigFromEnv } from '@aksara/firebase';

// Get Firebase config from environment variables
const firebaseConfig = getFirebaseConfigFromEnv();

// Initialize Firebase
const { app, auth, db, storage } = initializeFirebaseClient(firebaseConfig);

export { app, auth, db, storage };

// Export Firebase services
export default {
  app,
  auth,
  db,
  storage
};
