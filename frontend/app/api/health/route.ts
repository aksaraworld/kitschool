/**
 * GET /api/health – serverless health check (Aksara-style, same-origin on Vercel).
 */

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ status: 'ok', message: 'Cognifa API (serverless)' });
}
