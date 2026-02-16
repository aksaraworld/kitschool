/**
 * Serverless POST /api/invoices/[id]/payment-attempts.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import { invoicesCollection, paymentAttemptsCollection, docToJson } from '@/lib/server/firebase-admin';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const { id: invoiceId } = await params;
    const invoiceRef = invoicesCollection().doc(invoiceId);
    const invoiceSnap = await invoiceRef.get();
    if (!invoiceSnap.exists) return NextResponse.json({ message: 'Invoice not found' }, { status: 404 });
    if ((invoiceSnap.data()?.schoolId as string) !== schoolId) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const ref = paymentAttemptsCollection().doc();
    await ref.set({
      ...body,
      invoiceId,
      schoolId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const created = await ref.get();
    return NextResponse.json(docToJson(created), { status: 201 });
  } catch (e) {
    console.error('POST /api/invoices/[id]/payment-attempts error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
