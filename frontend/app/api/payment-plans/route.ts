/**
 * Payment plans API — per-school academic-year billing structure.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import { docToJson, getFirestore, paymentPlansCollection } from '@/lib/server/firebase-admin';
import { canManageCatalog } from '@/lib/server/finance';
import type { PlanItem } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const yearId = req.nextUrl.searchParams.get('yearId');
    let query = paymentPlansCollection().where('schoolId', '==', schoolId);
    if (yearId) query = query.where('yearId', '==', yearId) as ReturnType<typeof paymentPlansCollection>;
    const snap = await query.get();
    const rows = snap.docs
      .map((d) => docToJson(d))
      .sort((a, b) => String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? '')));
    return NextResponse.json(rows);
  } catch (e) {
    console.error('GET /api/payment-plans error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!canManageCatalog(auth)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const items = (body.items ?? []) as PlanItem[];
    const isActive = body.isActive !== false;
    const ref = paymentPlansCollection().doc();

    if (isActive && body.yearId) {
      const existing = await paymentPlansCollection()
        .where('schoolId', '==', schoolId)
        .where('yearId', '==', String(body.yearId))
        .get();
      const batch = getFirestore().batch();
      for (const doc of existing.docs) {
        batch.update(doc.ref, { isActive: false, updatedAt: new Date() });
      }
      await batch.commit();
    }

    await ref.set({
      schoolId,
      yearId: String(body.yearId ?? ''),
      name: String(body.name ?? 'Struktur Pembayaran'),
      isActive,
      scope: body.scope ?? {},
      items,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const created = await ref.get();
    return NextResponse.json(docToJson(created), { status: 201 });
  } catch (e) {
    console.error('POST /api/payment-plans error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
