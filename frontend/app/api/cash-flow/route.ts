/**
 * GET/POST /api/cash-flow
 * Principal only. Uang masuk/keluar – summary + daftar transaksi.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId, hasFullAccess } from '@/lib/server/auth-helpers';
import { cashFlowCollection, docToJson } from '@/lib/server/firebase-admin';
import { UserRole } from '@/lib/types';

const LIMIT = 100;

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (auth.role !== UserRole.PRINCIPAL && !hasFullAccess(auth)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const snapshot = await cashFlowCollection()
      .where('schoolId', '==', schoolId)
      .limit(LIMIT)
      .get();

    const entries = snapshot.docs
      .map((d) => docToJson(d) as { _id: string; type: string; amount: number; description?: string; date: string })
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    let totalIn = 0;
    let totalOut = 0;
    for (const e of entries) {
      if (e.type === 'in') totalIn += Number(e.amount) || 0;
      else totalOut += Number(e.amount) || 0;
    }
    const saldo = totalIn - totalOut;

    return NextResponse.json({
      summary: { totalIn, totalOut, saldo },
      entries,
    });
  } catch (e) {
    console.error('GET /api/cash-flow error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (auth.role !== UserRole.PRINCIPAL && !hasFullAccess(auth)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const type = body.type === 'out' ? 'out' : 'in';
    const amount = Math.abs(Number(body.amount)) || 0;
    const description = String(body.description ?? '').trim() || (type === 'in' ? 'Penerimaan' : 'Pengeluaran');
    const date = body.date ? new Date(body.date) : new Date();
    const dateStr = date.toISOString().slice(0, 10);

    const ref = cashFlowCollection().doc();
    await ref.set({
      schoolId,
      type,
      amount,
      description,
      date: dateStr,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const created = await ref.get();
    return NextResponse.json(docToJson(created), { status: 201 });
  } catch (e) {
    console.error('POST /api/cash-flow error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
