/**
 * GET /api/pos/students — search & suggest students for POS.
 * Query: q, yearId, classId, jenjang (MTs|MA)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import { canAccessPos, searchStudentsForPos } from '@/lib/server/finance';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!canAccessPos(auth)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const q = req.nextUrl.searchParams.get('q') ?? '';
    const yearId = req.nextUrl.searchParams.get('yearId') ?? undefined;
    const classId = req.nextUrl.searchParams.get('classId') ?? undefined;
    const jenjang = req.nextUrl.searchParams.get('jenjang') ?? undefined;

    const students = await searchStudentsForPos(schoolId, { query: q, yearId, classId, jenjang });
    return NextResponse.json(students);
  } catch (e) {
    console.error('GET /api/pos/students error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
