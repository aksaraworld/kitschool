/**
 * GET /api/health – serverless health check (Aksara-style, same-origin on Vercel).
 */

import { NextResponse } from 'next/server';

export async function GET() {
  const clientConfigured = Boolean(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  );
  const adminConfigured = Boolean(
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
      (process.env.FIREBASE_PROJECT_ID &&
        process.env.FIREBASE_CLIENT_EMAIL &&
        process.env.FIREBASE_PRIVATE_KEY)
  );

  return NextResponse.json({
    status: 'ok',
    message: 'Aksara School Management API (serverless)',
    firebase: {
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || null,
      clientConfigured,
      adminConfigured,
    },
  });
}
