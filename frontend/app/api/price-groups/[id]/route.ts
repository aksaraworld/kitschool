import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import { docToJson, getFirestore, priceGroupsCollection } from '@/lib/server/firebase-admin';
import { canManageCatalog } from '@/lib/server/finance';

type RouteParams = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!canManageCatalog(auth)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const doc = await priceGroupsCollection().doc(id).get();
    if (!doc.exists) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    const data = doc.data() as { schoolId?: string };
    const schoolId = getSchoolId(req, auth);
    if (schoolId && data.schoolId !== schoolId) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (body.name != null) update.name = body.name;
    if (body.description != null) update.description = body.description;
    if (body.isDefault != null) {
      update.isDefault = Boolean(body.isDefault);
      if (update.isDefault && schoolId) {
        const existing = await priceGroupsCollection().where('schoolId', '==', schoolId).get();
        const batch = getFirestore().batch();
        for (const d of existing.docs) {
          if (d.id !== id) batch.update(d.ref, { isDefault: false, updatedAt: new Date() });
        }
        await batch.commit();
      }
    }

    await priceGroupsCollection().doc(id).update(update);
    const updated = await priceGroupsCollection().doc(id).get();
    return NextResponse.json(docToJson(updated));
  } catch (e) {
    console.error('PUT /api/price-groups/[id] error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!canManageCatalog(auth)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const doc = await priceGroupsCollection().doc(id).get();
    if (!doc.exists) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    const data = doc.data() as { schoolId?: string };
    const schoolId = getSchoolId(req, auth);
    if (schoolId && data.schoolId !== schoolId) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    await priceGroupsCollection().doc(id).delete();
    return NextResponse.json({ message: 'Deleted' });
  } catch (e) {
    console.error('DELETE /api/price-groups/[id] error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
