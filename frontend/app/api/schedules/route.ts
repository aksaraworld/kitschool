/**
 * Serverless GET/POST /api/schedules.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId, hasAnyRole, hasFullAccess } from '@/lib/server/auth-helpers';
import { schedulesCollection, docToJson } from '@/lib/server/firebase-admin';
import { UserRole } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const classId = req.nextUrl.searchParams.get('classId');
    const type = req.nextUrl.searchParams.get('type');
    const startDate = req.nextUrl.searchParams.get('startDate');
    const endDate = req.nextUrl.searchParams.get('endDate');

    let query = schedulesCollection().where('schoolId', '==', schoolId);
    if (classId) query = query.where('classId', '==', classId) as ReturnType<typeof schedulesCollection>;
    if (type) query = query.where('type', '==', type) as ReturnType<typeof schedulesCollection>;

    const snapshot = await query.get();
    let rows = snapshot.docs.map((d) => docToJson(d));
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      rows = rows.filter((r) => {
        const d = r.startDate instanceof Date ? r.startDate : new Date(String(r.startDate));
        return d >= start && d <= end;
      });
    }
    rows.sort((a, b) => String(a.startDate || '').localeCompare(String(b.startDate || '')));
    return NextResponse.json(rows);
  } catch (e) {
    console.error('GET /api/schedules error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (
      !hasFullAccess(auth) &&
      !hasAnyRole(auth, [UserRole.TEACHER, UserRole.HOMEROOM_TEACHER, UserRole.STAFF])
    ) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const ref = schedulesCollection().doc();
    await ref.set({
      ...body,
      schoolId,
      createdBy: auth.uid,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const created = await ref.get();
    return NextResponse.json(docToJson(created), { status: 201 });
  } catch (e) {
    console.error('POST /api/schedules error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
