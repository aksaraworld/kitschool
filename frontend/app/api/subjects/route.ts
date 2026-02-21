/**
 * Serverless GET/POST /api/subjects.
 * Query: ?categoryId=...&teacherId=...
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import { subjectsCollection, docToJson } from '@/lib/server/firebase-admin';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const categoryId = req.nextUrl.searchParams.get('categoryId');
    const teacherId = req.nextUrl.searchParams.get('teacherId');

    let query = subjectsCollection().where('schoolId', '==', schoolId) as ReturnType<typeof subjectsCollection>;
    if (categoryId) query = query.where('categoryId', '==', categoryId) as ReturnType<typeof subjectsCollection>;
    if (teacherId) query = query.where('teacherId', '==', teacherId) as ReturnType<typeof subjectsCollection>;

    const snapshot = await query.get();
    const rows = snapshot.docs.map((d) => docToJson(d));
    return NextResponse.json(rows);
  } catch (e) {
    console.error('GET /api/subjects error:', e);
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
    const ref = subjectsCollection().doc();
    await ref.set({
      ...body,
      schoolId,
      isActive: body.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const created = await ref.get();
    return NextResponse.json(docToJson(created), { status: 201 });
  } catch (e) {
    console.error('POST /api/subjects error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
