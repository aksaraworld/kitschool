/**
 * Serverless PUT /api/config/[key] (SaaS Admin only).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/server/auth-helpers';
import { configCollection, docToJson } from '@/lib/server/firebase-admin';
import { UserRole } from '@/lib/types';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (auth.role !== UserRole.SAAS_ADMIN) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const { key } = await params;
    const body = await req.json().catch(() => ({}));
    const value = body.value;

    const type =
      typeof value === 'number' ? 'number' : typeof value === 'boolean' ? 'boolean' : typeof value === 'object' ? 'object' : 'string';

    await configCollection().doc(key).set({ key, value, type, updatedAt: new Date() }, { merge: true });
    const updated = await configCollection().doc(key).get();
    return NextResponse.json(docToJson(updated));
  } catch (e) {
    console.error('PUT /api/config/[key] error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
