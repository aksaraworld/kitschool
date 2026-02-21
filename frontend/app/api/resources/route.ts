/**
 * Serverless GET/POST /api/resources (LMS lesson materials).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import { resourcesCollection, docToJson } from '@/lib/server/firebase-admin';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const subjectId = req.nextUrl.searchParams.get('subjectId');
    const type = req.nextUrl.searchParams.get('type');

    let query = resourcesCollection().where('schoolId', '==', schoolId);
    if (subjectId) query = query.where('subjectId', '==', subjectId) as ReturnType<typeof resourcesCollection>;
    if (type) query = query.where('type', '==', type) as ReturnType<typeof resourcesCollection>;

    const snapshot = await query.get();
    const rows = snapshot.docs.map((d) => docToJson(d));
    return NextResponse.json(rows);
  } catch (e) {
    console.error('GET /api/resources error:', e);
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
    const ref = resourcesCollection().doc();
    await ref.set({
      ...body,
      schoolId,
      createdBy: body.createdBy ?? auth.uid,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const created = await ref.get();
    return NextResponse.json(docToJson(created), { status: 201 });
  } catch (e) {
    console.error('POST /api/resources error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
