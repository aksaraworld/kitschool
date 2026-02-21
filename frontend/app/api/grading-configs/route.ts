/**
 * Serverless GET/POST /api/grading-configs.
 * Query: ?level=tk|sd|smp|sma|smk
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import { gradingConfigsCollection, docToJson } from '@/lib/server/firebase-admin';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const level = req.nextUrl.searchParams.get('level');

    let query = gradingConfigsCollection().where('schoolId', '==', schoolId);
    if (level) {
      query = query.where('level', '==', level) as ReturnType<typeof gradingConfigsCollection>;
    }

    const snapshot = await query.get();
    const rows = snapshot.docs.map((d) => docToJson(d));
    return NextResponse.json(rows);
  } catch (e) {
    console.error('GET /api/grading-configs error:', e);
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
    const ref = gradingConfigsCollection().doc();
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
    console.error('POST /api/grading-configs error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
