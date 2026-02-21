/**
 * Serverless GET/POST /api/grade-components.
 * Query: ?studentId=...&subjectId=...&yearId=...&semester=1|2
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import { gradeComponentsCollection, docToJson } from '@/lib/server/firebase-admin';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const studentId = req.nextUrl.searchParams.get('studentId');
    const subjectId = req.nextUrl.searchParams.get('subjectId');
    const yearId = req.nextUrl.searchParams.get('yearId');
    const semester = req.nextUrl.searchParams.get('semester');

    let query = gradeComponentsCollection().where('schoolId', '==', schoolId);
    if (studentId) query = query.where('studentId', '==', studentId) as ReturnType<typeof gradeComponentsCollection>;
    if (subjectId) query = query.where('subjectId', '==', subjectId) as ReturnType<typeof gradeComponentsCollection>;
    if (yearId) query = query.where('yearId', '==', yearId) as ReturnType<typeof gradeComponentsCollection>;
    if (semester) query = query.where('semester', '==', parseInt(semester, 10)) as ReturnType<typeof gradeComponentsCollection>;

    const snapshot = await query.get();
    const rows = snapshot.docs.map((d) => docToJson(d));
    return NextResponse.json(rows);
  } catch (e) {
    console.error('GET /api/grade-components error:', e);
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
    const ref = gradeComponentsCollection().doc();
    await ref.set({
      ...body,
      schoolId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const created = await ref.get();
    return NextResponse.json(docToJson(created), { status: 201 });
  } catch (e) {
    console.error('POST /api/grade-components error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
