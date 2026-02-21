/**
 * Serverless GET /api/classes/[id].
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId, hasFullAccess } from '@/lib/server/auth-helpers';
import {
  classesCollection,
  yearsCollection,
  majorsCollection,
  usersCollection,
  docToJson,
} from '@/lib/server/firebase-admin';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const doc = await classesCollection().doc(id).get();
    if (!doc.exists) return NextResponse.json({ message: 'Not found' }, { status: 404 });

    const data = doc.data() as Record<string, unknown>;
    const row = docToJson(doc) as Record<string, unknown>;
    const schoolId = getSchoolId(req, auth);
    const dataSchoolId = data?.schoolId as string | undefined;
    if (schoolId && dataSchoolId !== schoolId) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const approvalStatus = row.approvalStatus as string | undefined;
    if (approvalStatus === 'pending' && !hasFullAccess(auth)) {
      return NextResponse.json({ message: 'Class pending approval' }, { status: 403 });
    }

    const yearId = row.yearId as string | undefined;
    const majorId = row.majorId as string | undefined;
    const homeroomId = row.homeroomTeacherId as string | undefined;
    if (yearId) {
      const y = await yearsCollection().doc(yearId).get();
      row.yearId = y.exists ? docToJson(y) : { _id: yearId, name: 'N/A' };
    }
    if (majorId) {
      const m = await majorsCollection().doc(majorId).get();
      row.majorId = m.exists ? docToJson(m) : { _id: majorId, name: 'N/A' };
    }
    if (homeroomId) {
      const t = await usersCollection().doc(homeroomId).get();
      row.homeroomTeacherId = t.exists
        ? { _id: t.id, name: (t.data() as { name?: string })?.name ?? 'N/A' }
        : { _id: homeroomId, name: 'N/A' };
    }
    return NextResponse.json(row);
  } catch (e) {
    console.error('GET /api/classes/[id] error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const doc = await classesCollection().doc(id).get();
    if (!doc.exists) return NextResponse.json({ message: 'Not found' }, { status: 404 });

    const data = doc.data() as Record<string, unknown>;
    const schoolId = getSchoolId(req, auth);
    const dataSchoolId = data?.schoolId as string | undefined;
    if (schoolId && dataSchoolId !== schoolId) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const updateData: Record<string, unknown> = { ...body };
    delete updateData._id;
    delete updateData.id;
    delete updateData.schoolId;
    delete updateData.createdAt;
    updateData.updatedAt = new Date();

    if (updateData.approvalStatus === 'approved' && !hasFullAccess(auth)) {
      return NextResponse.json({ message: 'Only Kepala Sekolah can approve classes' }, { status: 403 });
    }

    await classesCollection().doc(id).update(updateData);
    const updated = await classesCollection().doc(id).get();
    let row = docToJson(updated) as Record<string, unknown>;
    const yearId = row.yearId as string | undefined;
    const majorId = row.majorId as string | undefined;
    const homeroomId = row.homeroomTeacherId as string | undefined;
    if (yearId) {
      const y = await yearsCollection().doc(yearId).get();
      row.yearId = y.exists ? docToJson(y) : { _id: yearId, name: 'N/A' };
    }
    if (majorId) {
      const m = await majorsCollection().doc(majorId).get();
      row.majorId = m.exists ? docToJson(m) : { _id: majorId, name: 'N/A' };
    }
    if (homeroomId) {
      const t = await usersCollection().doc(homeroomId).get();
      row.homeroomTeacherId = t.exists
        ? { _id: t.id, name: (t.data() as { name?: string })?.name ?? 'N/A' }
        : { _id: homeroomId, name: 'N/A' };
    }
    return NextResponse.json(row);
  } catch (e) {
    console.error('PUT /api/classes/[id] error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
