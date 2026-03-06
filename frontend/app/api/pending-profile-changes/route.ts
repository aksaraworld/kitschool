/**
 * GET/POST /api/pending-profile-changes
 * GET: Parent lists pending changes for their children.
 * POST: Student creates pending change (address/email/phone) for ortu approval.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import { pendingProfileChangesCollection, usersCollection, docToJson, getAuth } from '@/lib/server/firebase-admin';
import { UserRole } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (auth.role !== UserRole.PARENT) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const parentDoc = await usersCollection().doc(auth.uid).get();
    const children = (parentDoc.data() as { children?: string[] })?.children ?? [];
    if (children.length === 0) return NextResponse.json([]);

    const snapshot = await pendingProfileChangesCollection()
      .where('schoolId', '==', schoolId)
      .where('status', '==', 'pending')
      .get();

    const rows = snapshot.docs
      .map((d) => docToJson(d) as { _id: string; studentId: string; changes: Record<string, unknown>; requestedAt?: string; createdAt?: string })
      .filter((r) => children.includes(r.studentId));

    const studentIds = [...new Set(rows.map((r) => r.studentId))];
    const userMap = new Map<string, { name: string }>();
    await Promise.all(
      studentIds.map(async (sid) => {
        const u = await usersCollection().doc(sid).get();
        if (u.exists) {
          const d = u.data() as { name?: string };
          userMap.set(sid, { name: d.name ?? sid });
        }
      })
    );
    const enriched = rows.map((r) => ({ ...r, studentName: userMap.get(r.studentId)?.name ?? r.studentId }));

    return NextResponse.json(enriched);
  } catch (e) {
    console.error('GET /api/pending-profile-changes error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (auth.role !== UserRole.STUDENT) return NextResponse.json({ message: 'Only students can request profile changes' }, { status: 403 });

    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const changes: Record<string, unknown> = {};
    if (body.address != null) changes.address = String(body.address);
    if (body.email != null) changes.email = String(body.email);
    if (body.phone != null) changes.phone = String(body.phone);
    if (Object.keys(changes).length === 0) {
      return NextResponse.json({ message: 'No address, email, or phone changes' }, { status: 400 });
    }

    const existingDoc = await usersCollection().doc(auth.uid).get();
    const existing = (existingDoc.data() ?? {}) as { emailProvidedBySchool?: boolean };
    if (changes.email != null && existing.emailProvidedBySchool) {
      delete changes.email;
    }
    if (Object.keys(changes).length === 0) {
      return NextResponse.json({ message: 'No allowed changes (email may be school-provided)' }, { status: 400 });
    }

    const ref = pendingProfileChangesCollection().doc();
    await ref.set({
      schoolId,
      studentId: auth.uid,
      changes,
      status: 'pending',
      requestedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const created = await ref.get();
    return NextResponse.json(docToJson(created), { status: 201 });
  } catch (e) {
    console.error('POST /api/pending-profile-changes error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
