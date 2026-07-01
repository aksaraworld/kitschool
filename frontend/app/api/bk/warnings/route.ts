import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import { canViewBk } from '@/lib/server/bk';
import { disciplineWarningsCollection, docToJson } from '@/lib/server/firebase-admin';
import { parseLimit, DEFAULT_LIST_LIMIT } from '@/lib/server/firestore-query';
import { UserRole } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    if (auth.role !== UserRole.PARENT && !canViewBk(auth)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const studentId = req.nextUrl.searchParams.get('studentId');
    const status = req.nextUrl.searchParams.get('status');
    const limit = parseLimit(req.nextUrl.searchParams.get('limit'), DEFAULT_LIST_LIMIT);

    let query = disciplineWarningsCollection()
      .where('schoolId', '==', schoolId)
      .orderBy('createdAt', 'desc')
      .limit(limit);

    const snap = await query.get();
    let rows = snap.docs.map((d) => docToJson(d));

    if (auth.role === UserRole.PARENT) {
      rows = rows.filter((r) => r.parentId === auth.uid);
    }
    if (studentId) rows = rows.filter((r) => r.studentId === studentId);
    if (status) rows = rows.filter((r) => r.status === status);

    return NextResponse.json(rows, { headers: { 'Cache-Control': 'private, max-age=30' } });
  } catch (e) {
    console.error('GET /api/bk/warnings error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
