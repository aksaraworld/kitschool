import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import { canManageLms } from '@/lib/server/lms';
import { docToJson, lmsSyllabusCollection } from '@/lib/server/firebase-admin';
import { isMissingIndexError } from '@/lib/server/firestore-query';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth || !canManageLms(auth)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    let rows: ReturnType<typeof docToJson>[] = [];
    try {
      const snap = await lmsSyllabusCollection()
        .where('schoolId', '==', schoolId)
        .orderBy('updatedAt', 'desc')
        .limit(100)
        .get();
      rows = snap.docs.map((d) => docToJson(d));
    } catch (e) {
      if (!isMissingIndexError(e)) throw e;
      const snap = await lmsSyllabusCollection().where('schoolId', '==', schoolId).limit(200).get();
      rows = snap.docs
        .map((d) => docToJson(d))
        .sort((a, b) => String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? '')))
        .slice(0, 100);
    }

    return NextResponse.json(rows, { headers: { 'Cache-Control': 'private, max-age=30' } });
  } catch (e) {
    console.error('GET /api/lms/syllabus error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
