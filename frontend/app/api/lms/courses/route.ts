import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import { canManageLms } from '@/lib/server/lms';
import { docToJson, lmsCoursesCollection } from '@/lib/server/firebase-admin';

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth || !canManageLms(auth)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const syllabusId = String(body.syllabusId ?? '').trim();
    const weekNumber = Number(body.weekNumber);
    const title = String(body.title ?? '').trim() || `Materi Minggu ${weekNumber}`;

    if (!syllabusId) return NextResponse.json({ message: 'syllabusId wajib' }, { status: 400 });
    if (!weekNumber || weekNumber < 1) return NextResponse.json({ message: 'weekNumber tidak valid' }, { status: 400 });

    const now = new Date();
    const ref = lmsCoursesCollection().doc();
    await ref.set({
      schoolId,
      syllabusId,
      weekNumber,
      title,
      isPublished: body.isPublished !== false,
      teacherId: auth.uid,
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json(docToJson(await ref.get()), { status: 201 });
  } catch (e) {
    console.error('POST /api/lms/courses error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
