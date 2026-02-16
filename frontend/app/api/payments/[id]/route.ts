/**
 * Serverless PUT /api/payments/[id].
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import { paymentsCollection, docToJson } from '@/lib/server/firebase-admin';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const { id } = await params;
    const ref = paymentsCollection().doc(id);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ message: 'Payment not found' }, { status: 404 });
    if ((snap.data()?.schoolId as string) !== schoolId) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    await ref.update({ ...body, updatedAt: new Date() });
    const updated = await ref.get();
    return NextResponse.json(docToJson(updated));
  } catch (e) {
    console.error('PUT /api/payments/[id] error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
