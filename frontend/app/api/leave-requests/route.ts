/**
 * Serverless GET/POST /api/leave-requests.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import { leaveRequestsCollection, docToJson } from '@/lib/server/firebase-admin';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const staffId = req.nextUrl.searchParams.get('staffId');
    const status = req.nextUrl.searchParams.get('status');

    let query = leaveRequestsCollection().where('schoolId', '==', schoolId);
    if (staffId) query = query.where('staffId', '==', staffId) as ReturnType<typeof leaveRequestsCollection>;
    if (status) query = query.where('status', '==', status) as ReturnType<typeof leaveRequestsCollection>;

    const snapshot = await query.get();
    const rows = snapshot.docs.map((d) => docToJson(d));
    return NextResponse.json(rows);
  } catch (e) {
    console.error('GET /api/leave-requests error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const ref = leaveRequestsCollection().doc();
    await ref.set({
      ...body,
      schoolId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const created = await ref.get();
    return NextResponse.json(docToJson(created), { status: 201 });
  } catch (e) {
    console.error('POST /api/leave-requests error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
