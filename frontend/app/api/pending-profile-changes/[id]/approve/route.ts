/**
 * POST /api/pending-profile-changes/[id]/approve
 * Parent approves pending profile change; applies changes to user and deletes pending.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import {
  pendingProfileChangesCollection,
  usersCollection,
  docToJson,
  getAuth,
} from '@/lib/server/firebase-admin';
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

    const doc = docToJson(snap) as { schoolId?: string; studentId: string; status?: string; changes?: Record<string, unknown> };
    if (doc.schoolId !== schoolId || doc.status !== 'pending') {
      return NextResponse.json({ message: 'Forbidden or already processed' }, { status: 403 });
    }

    const parentDoc = await usersCollection().doc(auth.uid).get();
    const children = (parentDoc.data() as { children?: string[] })?.children ?? [];
    if (!children.includes(doc.studentId)) {
      return NextResponse.json({ message: 'Not your child' }, { status: 403 });
    }

    const changes = doc.changes ?? {};
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (changes.address != null) updateData.address = changes.address;
    if (changes.phone != null) updateData.phone = changes.phone;
    if (changes.email != null) {
      updateData.email = changes.email;
      try {
        await getAuth().updateUser(doc.studentId, { email: String(changes.email) });
      } catch (e) {
        console.error('Firebase Auth email update error:', e);
        return NextResponse.json({ message: 'Gagal mengubah email.' }, { status: 400 });
      }
    }

    await usersCollection().doc(doc.studentId).update(updateData);
    await ref.update({ status: 'approved', updatedAt: new Date() });

    return NextResponse.json({ success: true, message: 'Perubahan disetujui' });
  } catch (e) {
    console.error('POST /api/pending-profile-changes/[id]/approve error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
