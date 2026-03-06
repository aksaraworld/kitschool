/**
 * GET/PUT/DELETE /api/beasiswa/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId, hasFullAccess, hasAnyRole } from '@/lib/server/auth-helpers';
import { ROLES_CAN_MANAGE_USERS } from '@/lib/types';
import { scholarshipsCollection, docToJson } from '@/lib/server/firebase-admin';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const doc = await scholarshipsCollection().doc(id).get();
    if (!doc.exists) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    const data = doc.data() as { schoolId?: string };
    const schoolId = getSchoolId(req, auth);
    if (schoolId && data.schoolId !== schoolId) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    return NextResponse.json(docToJson(doc));
  } catch (e) {
    console.error('GET /api/beasiswa/[id] error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!hasFullAccess(auth) && !hasAnyRole(auth, ROLES_CAN_MANAGE_USERS.map(String))) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    const { id } = await params;
    const doc = await scholarshipsCollection().doc(id).get();
    if (!doc.exists) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    const body = await req.json().catch(() => ({}));
    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (body.name !== undefined) update.name = body.name;
    if (body.description !== undefined) update.description = body.description;
    if (body.isActive !== undefined) update.isActive = body.isActive;
    if (body.yearId !== undefined) update.yearId = body.yearId;
    await scholarshipsCollection().doc(id).update(update);
    const updated = await scholarshipsCollection().doc(id).get();
    return NextResponse.json(docToJson(updated));
  } catch (e) {
    console.error('PUT /api/beasiswa/[id] error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!hasFullAccess(auth) && !hasAnyRole(auth, ROLES_CAN_MANAGE_USERS.map(String))) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    const { id } = await params;
    const doc = await scholarshipsCollection().doc(id).get();
    if (!doc.exists) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    await scholarshipsCollection().doc(id).delete();
    return NextResponse.json({ message: 'Deleted' });
  } catch (e) {
    console.error('DELETE /api/beasiswa/[id] error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
