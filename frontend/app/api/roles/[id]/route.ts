/**
 * Serverless GET/PUT/DELETE /api/roles/[id] – get, update, delete role definition. Kepala Sekolah only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId, hasFullAccess } from '@/lib/server/auth-helpers';
import { roleDefinitionsCollection, docToJson } from '@/lib/server/firebase-admin';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!hasFullAccess(auth)) {
      return NextResponse.json({ message: 'Only Kepala Sekolah can manage roles' }, { status: 403 });
    }

    const { id } = await params;
    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    if (id.startsWith('default-')) {
      return NextResponse.json({ message: 'Default role cannot be fetched by id' }, { status: 400 });
    }

    const doc = await roleDefinitionsCollection().doc(id).get();
    if (!doc.exists) return NextResponse.json({ message: 'Role not found' }, { status: 404 });
    const data = doc.data() as { schoolId?: string };
    if (data?.schoolId !== schoolId) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json(docToJson(doc));
  } catch (e) {
    console.error('GET /api/roles/[id] error:', e);
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
    if (!hasFullAccess(auth)) {
      return NextResponse.json({ message: 'Only Kepala Sekolah can manage roles' }, { status: 403 });
    }

    const { id } = await params;
    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    if (id.startsWith('default-')) {
      return NextResponse.json({ message: 'Default roles cannot be edited; create a custom role instead' }, { status: 400 });
    }

    const doc = await roleDefinitionsCollection().doc(id).get();
    if (!doc.exists) return NextResponse.json({ message: 'Role not found' }, { status: 404 });
    const existing = doc.data() as { schoolId?: string };
    if (existing?.schoolId !== schoolId) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const updateData: Record<string, unknown> = {
      ...body,
      updatedAt: new Date(),
    };
    delete updateData._id;
    delete updateData.id;
    delete updateData.schoolId;
    delete updateData.createdAt;

    await roleDefinitionsCollection().doc(id).update(updateData);
    const updated = await roleDefinitionsCollection().doc(id).get();
    return NextResponse.json(docToJson(updated));
  } catch (e) {
    console.error('PUT /api/roles/[id] error:', e);
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
    if (!hasFullAccess(auth)) {
      return NextResponse.json({ message: 'Only Kepala Sekolah can manage roles' }, { status: 403 });
    }

    const { id } = await params;
    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    if (id.startsWith('default-')) {
      return NextResponse.json({ message: 'Default roles cannot be deleted' }, { status: 400 });
    }

    const doc = await roleDefinitionsCollection().doc(id).get();
    if (!doc.exists) return NextResponse.json({ message: 'Role not found' }, { status: 404 });
    const existing = doc.data() as { schoolId?: string };
    if (existing?.schoolId !== schoolId) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    await roleDefinitionsCollection().doc(id).delete();
    return NextResponse.json({ message: 'Role deleted successfully' });
  } catch (e) {
    console.error('DELETE /api/roles/[id] error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
