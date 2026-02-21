/**
 * Serverless GET/PUT/DELETE /api/rooms/[id].
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import { roomsCollection, docToJson } from '@/lib/server/firebase-admin';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const doc = await roomsCollection().doc(id).get();
    if (!doc.exists) return NextResponse.json({ message: 'Not found' }, { status: 404 });

    const data = doc.data() as { schoolId?: string };
    const schoolId = getSchoolId(req, auth);
    if (schoolId && data.schoolId !== schoolId) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    return NextResponse.json(docToJson(doc));
  } catch (e) {
    console.error('GET /api/rooms/[id] error:', e);
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
    const doc = await roomsCollection().doc(id).get();
    if (!doc.exists) return NextResponse.json({ message: 'Not found' }, { status: 404 });

    const data = doc.data() as { schoolId?: string };
    const schoolId = getSchoolId(req, auth);
    if (schoolId && data.schoolId !== schoolId) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const update = { ...body };
    delete update._id;
    delete update.id;
    delete update.schoolId;
    update.updatedAt = new Date();

    await roomsCollection().doc(id).update(update);
    const updated = await roomsCollection().doc(id).get();
    return NextResponse.json(docToJson(updated));
  } catch (e) {
    console.error('PUT /api/rooms/[id] error:', e);
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
    const doc = await roomsCollection().doc(id).get();
    if (!doc.exists) return NextResponse.json({ message: 'Not found' }, { status: 404 });

    const data = doc.data() as { schoolId?: string };
    const schoolId = getSchoolId(req, auth);
    if (schoolId && data.schoolId !== schoolId) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    await roomsCollection().doc(id).delete();
    return NextResponse.json({ message: 'Deleted successfully' });
  } catch (e) {
    console.error('DELETE /api/rooms/[id] error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
