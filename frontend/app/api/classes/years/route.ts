/**
 * Serverless GET/POST /api/classes/years.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import { yearsCollection, docToJson } from '@/lib/server/firebase-admin';
import { UserRole } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const snapshot = await yearsCollection().where('schoolId', '==', schoolId).get();
    const years = snapshot.docs.map((d) => docToJson(d));
    years.sort((a, b) => String(b.startDate || '').localeCompare(String(a.startDate || '')));
    return NextResponse.json(years);
  } catch (e) {
    console.error('GET /api/classes/years error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (auth.role !== UserRole.STAFF && auth.role !== UserRole.PRINCIPAL) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const data = { ...body, schoolId, createdAt: new Date(), updatedAt: new Date() };
    const ref = yearsCollection().doc();
    await ref.set(data);
    const created = await ref.get();
    return NextResponse.json(docToJson(created), { status: 201 });
  } catch (e) {
    console.error('POST /api/classes/years error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
