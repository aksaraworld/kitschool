/**
 * Serverless GET/POST /api/submissions (LMS assignment submissions).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import { submissionsCollection, docToJson } from '@/lib/server/firebase-admin';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const assignmentId = req.nextUrl.searchParams.get('assignmentId');
    const studentId = req.nextUrl.searchParams.get('studentId');

    let query = submissionsCollection().where('schoolId', '==', schoolId);
    if (assignmentId) query = query.where('assignmentId', '==', assignmentId) as ReturnType<typeof submissionsCollection>;
    if (studentId) query = query.where('studentId', '==', studentId) as ReturnType<typeof submissionsCollection>;

    const snapshot = await query.get();
    const rows = snapshot.docs.map((d) => docToJson(d));
    return NextResponse.json(rows);
  } catch (e) {
    console.error('GET /api/submissions error:', e);
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
    const ref = submissionsCollection().doc();
    await ref.set({
      ...body,
      schoolId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const created = await ref.get();
    return NextResponse.json(docToJson(created), { status: 201 });
  } catch (e) {
    console.error('POST /api/submissions error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
