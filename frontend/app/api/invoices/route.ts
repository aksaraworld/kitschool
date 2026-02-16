/**
 * Serverless GET /api/invoices.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import { invoicesCollection, docToJson } from '@/lib/server/firebase-admin';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const status = req.nextUrl.searchParams.get('status');
    const studentId = req.nextUrl.searchParams.get('studentId');

    let query = invoicesCollection().where('schoolId', '==', schoolId);
    if (status) query = query.where('status', '==', status) as ReturnType<typeof invoicesCollection>;
    if (studentId) query = query.where('studentId', '==', studentId) as ReturnType<typeof invoicesCollection>;

    const snapshot = await query.get();
    const rows = snapshot.docs.map((d) => docToJson(d));
    return NextResponse.json(rows);
  } catch (e) {
    console.error('GET /api/invoices error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
