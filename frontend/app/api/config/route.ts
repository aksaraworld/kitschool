/**
 * Serverless GET /api/config (SaaS Admin only).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/server/auth-helpers';
import { configCollection, docToJson } from '@/lib/server/firebase-admin';
import { UserRole } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (auth.role !== UserRole.SAAS_ADMIN) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const snapshot = await configCollection().get();
    const rows = snapshot.docs.map((d) => docToJson(d));
    rows.sort((a, b) => String(a.key).localeCompare(String(b.key)));
    return NextResponse.json(rows);
  } catch (e) {
    console.error('GET /api/config error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
