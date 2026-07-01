import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import { canManageBk, canViewBk } from '@/lib/server/bk';
import { disciplineWarningsCollection, docToJson } from '@/lib/server/firebase-admin';
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

    const snap = await disciplineWarningsCollection().where('schoolId', '==', schoolId).get();
    let rows = snap.docs.map((d) => docToJson(d));

    if (auth.role === UserRole.PARENT) {
      rows = rows.filter((r) => r.parentId === auth.uid);
    }
    if (studentId) rows = rows.filter((r) => r.studentId === studentId);
    if (status) rows = rows.filter((r) => r.status === status);

    rows.sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')));
    return NextResponse.json(rows.slice(0, 200));
  } catch (e) {
    console.error('GET /api/bk/warnings error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
