/**
 * Serverless GET/POST /api/fee-structures.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import { feeStructuresCollection, docToJson } from '@/lib/server/firebase-admin';
import { canManageCatalog } from '@/lib/server/finance';
import { FeeCategory, FeeFrequency, FinanceUnit } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const snapshot = await feeStructuresCollection().where('schoolId', '==', schoolId).get();
    const rows = snapshot.docs
      .map((d) => docToJson(d))
      .sort((a, b) => String(a.name ?? '').localeCompare(String(b.name ?? '')));
    return NextResponse.json(rows);
  } catch (e) {
    console.error('GET /api/fee-structures error:', e);
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
    const ref = feeStructuresCollection().doc();
    await ref.set({
      name: body.name,
      amountBase: Number(body.amountBase) || 0,
      frequency: body.frequency ?? FeeFrequency.MONTHLY,
      category: body.category ?? FeeCategory.OTHER,
      financeUnit: body.financeUnit ?? FinanceUnit.YAYASAN,
      description: body.description ?? '',
      code: body.code ?? '',
      schoolId,
      isActive: body.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const created = await ref.get();
    return NextResponse.json(docToJson(created), { status: 201 });
  } catch (e) {
    console.error('POST /api/fee-structures error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
