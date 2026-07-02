import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import { docToJson, getFirestore, paymentPlansCollection } from '@/lib/server/firebase-admin';
import { canManageCatalog } from '@/lib/server/finance';
import type { PlanItem } from '@/lib/types';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const doc = await paymentPlansCollection().doc(id).get();
    if (!doc.exists) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    const data = doc.data() as { schoolId?: string };
    const schoolId = getSchoolId(req, auth);
    if (schoolId && data.schoolId !== schoolId) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    return NextResponse.json(docToJson(doc));
  } catch (e) {
    console.error('GET /api/payment-plans/[id] error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!canManageCatalog(auth)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const doc = await paymentPlansCollection().doc(id).get();
    if (!doc.exists) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    const existing = doc.data() as { schoolId?: string; yearId?: string };
    const schoolId = getSchoolId(req, auth);
    if (schoolId && existing.schoolId !== schoolId) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (body.name != null) update.name = body.name;
    if (body.yearId != null) update.yearId = body.yearId;
    if (body.scope != null) update.scope = body.scope;
    if (body.items != null) update.items = body.items as PlanItem[];
    if (body.isActive != null) {
      update.isActive = Boolean(body.isActive);
      if (update.isActive && (body.yearId ?? existing.yearId)) {
        const yearId = String(body.yearId ?? existing.yearId);
        const others = await paymentPlansCollection()
          .where('schoolId', '==', schoolId)
          .where('yearId', '==', yearId)
          .get();
        const batch = getFirestore().batch();
        for (const d of others.docs) {
          if (d.id !== id) batch.update(d.ref, { isActive: false, updatedAt: new Date() });
        }
        await batch.commit();
      }
    }

    await paymentPlansCollection().doc(id).update(update);
    const updated = await paymentPlansCollection().doc(id).get();
    return NextResponse.json(docToJson(updated));
  } catch (e) {
    console.error('PUT /api/payment-plans/[id] error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!canManageCatalog(auth)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const doc = await paymentPlansCollection().doc(id).get();
    if (!doc.exists) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    const data = doc.data() as { schoolId?: string };
    const schoolId = getSchoolId(req, auth);
    if (schoolId && data.schoolId !== schoolId) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    await paymentPlansCollection().doc(id).delete();
    return NextResponse.json({ message: 'Deleted' });
  } catch (e) {
    console.error('DELETE /api/payment-plans/[id] error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
