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
    const academicYearId = req.nextUrl.searchParams.get('academicYearId');
    const limitParam = Number(req.nextUrl.searchParams.get('limit'));
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 1000) : 500;

    // Apply all equality filters to a base query. Equality-only filters across
    // multiple fields are served by Firestore's zigzag merge join (no composite
    // index needed) and are far cheaper than fetching the whole collection.
    const applyFilters = (q: FirebaseFirestore.Query): FirebaseFirestore.Query => {
      let out = q;
      if (status) out = out.where('status', '==', status);
      if (studentId) out = out.where('studentId', '==', studentId);
      if (academicYearId) out = out.where('academicYearId', '==', academicYearId);
      if (month) out = out.where('month', '==', Number(month));
      if (year) out = out.where('year', '==', Number(year));
      return out;
    };

    const isParent = auth.role === UserRole.PARENT;
    const rowMap = new Map<string, Record<string, unknown>>();

    if (isParent) {
      // Scope server-side to the parent's own + children's bills so a `limit`
      // can never silently hide a child's invoice behind unrelated school rows.
      const parentDoc = await usersCollection().doc(auth.uid).get();
      const children = (((parentDoc.data() as { children?: string[] })?.children) ?? []).map(String);

      const queries: Promise<FirebaseFirestore.QuerySnapshot>[] = [];
      // parentId path
      queries.push(
        applyFilters(invoicesCollection().where('schoolId', '==', schoolId).where('parentId', '==', auth.uid))
          .limit(limit)
          .get()
      );
      // children studentId path (Firestore `in` supports up to 30 values)
      for (let i = 0; i < children.length; i += 30) {
        const group = children.slice(i, i + 30);
        queries.push(
          applyFilters(invoicesCollection().where('schoolId', '==', schoolId).where('studentId', 'in', group))
            .limit(limit)
            .get()
        );
      }
      const snaps = await Promise.all(queries);
      for (const snap of snaps) for (const d of snap.docs) rowMap.set(d.id, docToJson(d));
    } else {
      const snapshot = await applyFilters(invoicesCollection().where('schoolId', '==', schoolId))
        .limit(limit)
        .get();
      for (const d of snapshot.docs) rowMap.set(d.id, docToJson(d));
    }

    const rows = Array.from(rowMap.values());
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
