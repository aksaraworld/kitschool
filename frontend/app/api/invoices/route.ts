/**
 * Serverless GET/POST /api/invoices.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId, hasAnyRole } from '@/lib/server/auth-helpers';
import { invoicesCollection, usersCollection, docToJson } from '@/lib/server/firebase-admin';
import { FINANCE_POS_ROLES, InvoiceStatus, UserRole } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const status = req.nextUrl.searchParams.get('status');
    const studentId = req.nextUrl.searchParams.get('studentId');
    const month = req.nextUrl.searchParams.get('month');
    const year = req.nextUrl.searchParams.get('year');

    let query = invoicesCollection().where('schoolId', '==', schoolId);
    if (status) query = query.where('status', '==', status) as ReturnType<typeof invoicesCollection>;
    if (studentId) query = query.where('studentId', '==', studentId) as ReturnType<typeof invoicesCollection>;

    const snapshot = await query.get();
    let rows = snapshot.docs.map((d) => docToJson(d));

    // Parents only see their children's bills
    if (auth.role === UserRole.PARENT) {
      const parentDoc = await usersCollection().doc(auth.uid).get();
      const children = ((parentDoc.data() as { children?: string[] })?.children) ?? [];
      rows = rows.filter(
        (r) => r.parentId === auth.uid || children.includes(String(r.studentId))
      );
    }

    if (month) rows = rows.filter((r) => String(r.month) === month);
    if (year) rows = rows.filter((r) => String(r.year) === year);

    rows.sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')));
    return NextResponse.json(rows);
  } catch (e) {
    console.error('GET /api/invoices error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!hasAnyRole(auth, FINANCE_POS_ROLES)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const ref = invoicesCollection().doc();
    const amount = Number(body.amount) || 0;
    await ref.set({
      ...body,
      schoolId,
      paidAmount: body.paidAmount ?? 0,
      remainingAmount: body.remainingAmount ?? amount,
      status: body.status ?? InvoiceStatus.PENDING,
      createdBy: auth.uid,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const created = await ref.get();
    return NextResponse.json(docToJson(created), { status: 201 });
  } catch (e) {
    console.error('POST /api/invoices error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
