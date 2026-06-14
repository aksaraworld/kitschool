/**
 * Serverless GET/PUT/DELETE /api/fee-structures/[id].
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import { feeStructuresCollection, docToJson } from '@/lib/server/firebase-admin';
import { canManageCatalog } from '@/lib/server/finance';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const doc = await feeStructuresCollection().doc(id).get();
    if (!doc.exists) return NextResponse.json({ message: 'Not found' }, { status: 404 });

    const data = doc.data() as { schoolId?: string };
    const schoolId = getSchoolId(req, auth);
    if (schoolId && data.schoolId !== schoolId) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    return NextResponse.json(docToJson(doc));
  } catch (e) {
    console.error('GET /api/fee-structures/[id] error:', e);
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
    if (!canManageCatalog(auth)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const doc = await feeStructuresCollection().doc(id).get();
    if (!doc.exists) return NextResponse.json({ message: 'Not found' }, { status: 404 });

    const data = doc.data() as { schoolId?: string };
    const schoolId = getSchoolId(req, auth);
    if (schoolId && data.schoolId !== schoolId) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const update: Record<string, unknown> = {};
    if (body.name != null) update.name = body.name;
    if (body.amountBase != null) update.amountBase = Number(body.amountBase);
    if (body.frequency != null) update.frequency = body.frequency;
    if (body.category != null) update.category = body.category;
    if (body.financeUnit != null) update.financeUnit = body.financeUnit;
    if (body.description != null) update.description = body.description;
    if (body.code != null) update.code = body.code;
    if (body.isActive != null) update.isActive = body.isActive;
    update.updatedAt = new Date();

    await feeStructuresCollection().doc(id).update(update);
    const updated = await feeStructuresCollection().doc(id).get();
    return NextResponse.json(docToJson(updated));
  } catch (e) {
    console.error('PUT /api/fee-structures/[id] error:', e);
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
    if (!canManageCatalog(auth)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const doc = await feeStructuresCollection().doc(id).get();
    if (!doc.exists) return NextResponse.json({ message: 'Not found' }, { status: 404 });

    const data = doc.data() as { schoolId?: string };
    const schoolId = getSchoolId(req, auth);
    if (schoolId && data.schoolId !== schoolId) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    await feeStructuresCollection().doc(id).delete();
    return NextResponse.json({ message: 'Deleted successfully' });
  } catch (e) {
    console.error('DELETE /api/fee-structures/[id] error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
