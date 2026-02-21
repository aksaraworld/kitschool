/**
 * Serverless GET/POST /api/grades.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import { gradesCollection, docToJson } from '@/lib/server/firebase-admin';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const studentId = req.nextUrl.searchParams.get('studentId');
    const examId = req.nextUrl.searchParams.get('examId');

    let query = gradesCollection().where('schoolId', '==', schoolId);
    if (studentId) query = query.where('studentId', '==', studentId) as ReturnType<typeof gradesCollection>;
    if (examId) query = query.where('examId', '==', examId) as ReturnType<typeof gradesCollection>;

    const snapshot = await query.get();
    const rows = snapshot.docs.map((d) => docToJson(d));
    return NextResponse.json(rows);
  } catch (e) {
    console.error('GET /api/grades error:', e);
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
    const ref = gradesCollection().doc();
    await ref.set({
      ...body,
      schoolId,
      isPublished: body.isPublished ?? false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const created = await ref.get();
    return NextResponse.json(docToJson(created), { status: 201 });
  } catch (e) {
    console.error('POST /api/grades error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
