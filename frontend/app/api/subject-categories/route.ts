/**
 * Serverless GET/POST /api/subject-categories.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import { subjectCategoriesCollection, docToJson } from '@/lib/server/firebase-admin';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const snapshot = await subjectCategoriesCollection()
      .where('schoolId', '==', schoolId)
      .get();
    const rows = snapshot.docs.map((d) => docToJson(d));
    return NextResponse.json(rows);
  } catch (e) {
    console.error('GET /api/subject-categories error:', e);
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
    const ref = subjectCategoriesCollection().doc();
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
    console.error('POST /api/subject-categories error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
