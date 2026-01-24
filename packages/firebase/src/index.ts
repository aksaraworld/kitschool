/**
 * Copyright (c) 2025 Panji Tianda (panjitianda@gmail.com) - In behalf of Aksara Nirwana Tianda. All rights reserved.
 */

// Export types (safe for both client and server)
export * from './types';

// Export client-side Firebase (browser-safe)
export * from './client';

// Admin exports are only available server-side
// Import directly from '@aksara/firebase/admin' if needed in backend
// This prevents Next.js from trying to bundle firebase-admin in the frontend
