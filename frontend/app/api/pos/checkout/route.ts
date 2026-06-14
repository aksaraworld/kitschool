/**
 * POST /api/pos/checkout — record offline cash payment via POS.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import { usersCollection } from '@/lib/server/firebase-admin';
import { canAccessPos, processPosCheckout } from '@/lib/server/finance';

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!canAccessPos(auth)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const { studentId, invoiceIds, catalogItems, amountPaid, notes } = body as {
      studentId?: string;
      invoiceIds?: string[];
      catalogItems?: { feeStructureId: string; quantity?: number }[];
      amountPaid?: number;
      notes?: string;
    };

    if (!studentId) return NextResponse.json({ message: 'studentId required' }, { status: 400 });
    if (!amountPaid || amountPaid <= 0) return NextResponse.json({ message: 'amountPaid required' }, { status: 400 });
    if (!invoiceIds?.length && !catalogItems?.length) {
      return NextResponse.json({ message: 'Pilih tagihan atau item katalog' }, { status: 400 });
    }

    const staffDoc = await usersCollection().doc(auth.uid).get();
    const staffName = String((staffDoc.data() as { name?: string })?.name ?? auth.email);

    const result = await processPosCheckout({
      schoolId,
      studentId,
      invoiceIds,
      catalogItems,
      amountPaid,
      notes,
      processedBy: auth.uid,
      processedByName: staffName,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server error';
    console.error('POST /api/pos/checkout error:', e);
    return NextResponse.json({ message: msg }, { status: 400 });
  }
}
