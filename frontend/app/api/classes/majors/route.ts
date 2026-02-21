/**
 * Serverless GET/POST /api/classes/majors.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId, hasFullAccess } from '@/lib/server/auth-helpers';
import { majorsCollection, docToJson } from '@/lib/server/firebase-admin';
import { UserRole } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const snapshot = await majorsCollection()
      .where('schoolId', '==', schoolId)
      .where('isActive', '==', true)
      .get();
    const majors = snapshot.docs.map((d) => docToJson(d));
    return NextResponse.json(majors);
  } catch (e) {
    console.error('GET /api/classes/majors error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!hasFullAccess(auth) && auth.role !== UserRole.STAFF) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const data = { ...body, schoolId, isActive: true, createdAt: new Date(), updatedAt: new Date() };
    const ref = majorsCollection().doc();
    await ref.set(data);
    const created = await ref.get();
    return NextResponse.json(docToJson(created), { status: 201 });
  } catch (e) {
    console.error('POST /api/classes/majors error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
