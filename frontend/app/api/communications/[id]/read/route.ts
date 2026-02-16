/**
 * Serverless PUT /api/communications/[id]/read – mark as read.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import { communicationsCollection } from '@/lib/server/firebase-admin';

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
    const ref = communicationsCollection().doc(id);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    if ((snap.data()?.schoolId as string) !== schoolId) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    await ref.update({ read: true, updatedAt: new Date() });
    return NextResponse.json({ message: 'Marked as read' });
  } catch (e) {
    console.error('PUT /api/communications/[id]/read error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
