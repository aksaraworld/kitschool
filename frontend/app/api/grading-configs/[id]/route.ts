/**
 * Serverless GET/PUT/DELETE /api/grading-configs/[id].
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import { gradingConfigsCollection, docToJson } from '@/lib/server/firebase-admin';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const doc = await gradingConfigsCollection().doc(id).get();
    if (!doc.exists) return NextResponse.json({ message: 'Not found' }, { status: 404 });

    const data = doc.data() as { schoolId?: string };
    const schoolId = getSchoolId(req, auth);
    if (schoolId && data.schoolId !== schoolId) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    return NextResponse.json(docToJson(doc));
  } catch (e) {
    console.error('GET /api/grading-configs/[id] error:', e);
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
    const doc = await gradingConfigsCollection().doc(id).get();
    if (!doc.exists) return NextResponse.json({ message: 'Not found' }, { status: 404 });

    const data = doc.data() as { schoolId?: string };
    const schoolId = getSchoolId(req, auth);
    if (schoolId && data.schoolId !== schoolId) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const update = { ...body };
    delete update._id;
    delete update.id;
    delete update.schoolId;
    (update as { updatedAt: Date }).updatedAt = new Date();

    await gradingConfigsCollection().doc(id).update(update);
    const updated = await gradingConfigsCollection().doc(id).get();
    return NextResponse.json(docToJson(updated));
  } catch (e) {
    console.error('PUT /api/grading-configs/[id] error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const doc = await gradingConfigsCollection().doc(id).get();
    if (!doc.exists) return NextResponse.json({ message: 'Not found' }, { status: 404 });

    const data = doc.data() as { schoolId?: string };
    const schoolId = getSchoolId(req, auth);
    if (schoolId && data.schoolId !== schoolId) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    await gradingConfigsCollection().doc(id).delete();
    return NextResponse.json({ message: 'Deleted successfully' });
  } catch (e) {
    console.error('DELETE /api/grading-configs/[id] error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
