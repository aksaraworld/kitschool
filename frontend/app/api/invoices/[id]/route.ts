/**
 * Serverless GET /api/invoices/[id].
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import { invoicesCollection, docToJson } from '@/lib/server/firebase-admin';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const { id } = await params;
    const snap = await invoicesCollection().doc(id).get();
    if (!snap.exists) return NextResponse.json({ message: 'Invoice not found' }, { status: 404 });
    if ((snap.data()?.schoolId as string) !== schoolId) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    return NextResponse.json(docToJson(snap));
  } catch (e) {
    console.error('GET /api/invoices/[id] error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
