/**
 * Price groups API — per-school billing tiers.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import { docToJson, getFirestore, priceGroupsCollection } from '@/lib/server/firebase-admin';
import { canManageCatalog } from '@/lib/server/finance';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const snap = await priceGroupsCollection().where('schoolId', '==', schoolId).get();
    const rows = snap.docs
      .map((d) => docToJson(d))
      .sort((a, b) => String(a.name ?? '').localeCompare(String(b.name ?? '')));
    return NextResponse.json(rows);
  } catch (e) {
    console.error('GET /api/price-groups error:', e);
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
    const isDefault = Boolean(body.isDefault);
    const ref = priceGroupsCollection().doc();

    if (isDefault) {
      const existing = await priceGroupsCollection().where('schoolId', '==', schoolId).get();
      const batch = getFirestore().batch();
      for (const doc of existing.docs) {
        batch.update(doc.ref, { isDefault: false, updatedAt: new Date() });
      }
      await batch.commit();
    }

    await ref.set({
      schoolId,
      name: String(body.name ?? 'Golongan Standar'),
      description: String(body.description ?? ''),
      isDefault: isDefault || false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const created = await ref.get();
    return NextResponse.json(docToJson(created), { status: 201 });
  } catch (e) {
    console.error('POST /api/price-groups error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
