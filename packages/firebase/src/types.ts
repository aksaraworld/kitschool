/**
 * Copyright (c) 2025 Panji Tianda (panjitianda@gmail.com) - In behalf of Aksara Nirwana Tianda. All rights reserved.
 */

/**
 * Firebase client configuration
 */
export interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

/**
 * Firebase Admin initialization options
 */
export interface FirebaseAdminOptions {
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

/**
 * Firebase Admin initialization result
 */
export interface FirebaseAdminInitResult {
  initialized: boolean;
  authAvailable: boolean;
  error?: Error;
}
