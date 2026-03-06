/**
 * POST /api/pending-profile-changes/[id]/reject
 * Parent rejects pending profile change.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import { pendingProfileChangesCollection, usersCollection, docToJson } from '@/lib/server/firebase-admin';
import { UserRole } from '@/lib/types';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (auth.role !== UserRole.PARENT) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const { id } = await params;
    const ref = pendingProfileChangesCollection().doc(id);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ message: 'Not found' }, { status: 404 });

    const doc = docToJson(snap) as { schoolId?: string; studentId: string; status?: string };
    if (doc.schoolId !== schoolId || doc.status !== 'pending') {
      return NextResponse.json({ message: 'Forbidden or already processed' }, { status: 403 });
    }

    const parentDoc = await usersCollection().doc(auth.uid).get();
    const children = (parentDoc.data() as { children?: string[] })?.children ?? [];
    if (!children.includes(doc.studentId)) {
      return NextResponse.json({ message: 'Not your child' }, { status: 403 });
    }

    await ref.update({ status: 'rejected', updatedAt: new Date() });

    return NextResponse.json({ success: true, message: 'Perubahan ditolak' });
  } catch (e) {
    console.error('POST /api/pending-profile-changes/[id]/reject error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
