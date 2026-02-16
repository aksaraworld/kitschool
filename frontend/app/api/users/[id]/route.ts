/**
 * Serverless /api/users/[id] – get one (GET), update (PUT), deactivate (DELETE).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, normalizeSchoolId } from '@/lib/server/auth-helpers';
import { getAuth, usersCollection } from '@/lib/server/firebase-admin';
import { UserRole } from '@/lib/types';

function docToUser(doc: { id: string; data: () => unknown }): Record<string, unknown> {
  const data = (doc.data() ?? {}) as Record<string, unknown>;
  const createdAt = (data.createdAt as { toDate?: () => Date })?.toDate?.() ?? data.createdAt;
  const updatedAt = (data.updatedAt as { toDate?: () => Date })?.toDate?.() ?? data.updatedAt;
  const schoolId = normalizeSchoolId(data.schoolId);
  return {
    _id: doc.id,
    uid: doc.id,
    ...data,
    schoolId: schoolId ?? data.schoolId,
    createdAt,
    updatedAt,
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (auth.uid !== id && auth.role !== UserRole.SAAS_ADMIN && auth.role !== UserRole.STAFF && auth.role !== UserRole.PRINCIPAL) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const userDoc = await usersCollection().doc(id).get();
    if (!userDoc.exists) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const user = docToUser(userDoc);
    if (auth.role !== UserRole.SAAS_ADMIN && (user.schoolId as string) !== auth.schoolId) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(user);
  } catch (e) {
    console.error('GET /api/users/[id] error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (auth.uid !== id && auth.role !== UserRole.SAAS_ADMIN && auth.role !== UserRole.PRINCIPAL) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const updateData = { ...body };
    delete updateData.uid;
    delete updateData._id;
    delete updateData.email;
    delete updateData.role;
    updateData.updatedAt = new Date();

    await usersCollection().doc(id).update(updateData);
    return NextResponse.json({ message: 'User updated successfully' });
  } catch (e) {
    console.error('PUT /api/users/[id] error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    if (auth.role !== UserRole.PRINCIPAL && auth.role !== UserRole.SAAS_ADMIN) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    await usersCollection().doc(id).update({
      isActive: false,
      updatedAt: new Date(),
    });

    try {
      await getAuth().updateUser(id, { disabled: true });
    } catch {
      // ignore if user already disabled
    }

    return NextResponse.json({ message: 'User deactivated successfully' });
  } catch (e) {
    console.error('DELETE /api/users/[id] error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
