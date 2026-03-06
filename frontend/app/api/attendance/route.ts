/**
 * Serverless GET/POST /api/attendance.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import { attendanceCollection, docToJson } from '@/lib/server/firebase-admin';
import { UserRole } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const studentId = req.nextUrl.searchParams.get('studentId');
    const userIdParam = req.nextUrl.searchParams.get('userId');
    const date = req.nextUrl.searchParams.get('date');
    const month = req.nextUrl.searchParams.get('month');
    const year = req.nextUrl.searchParams.get('year');

    let query = attendanceCollection().where('schoolId', '==', schoolId);
    if (studentId) query = query.where('studentId', '==', studentId) as ReturnType<typeof attendanceCollection>;
    else if (userIdParam) query = query.where('userId', '==', userIdParam) as ReturnType<typeof attendanceCollection>;
    if (date) query = query.where('date', '==', date) as ReturnType<typeof attendanceCollection>;

    const snapshot = await query.get();
    let rows = snapshot.docs.map((d) => docToJson(d));
    if (month && year && (userIdParam || studentId)) {
      const m = parseInt(month, 10);
      const y = parseInt(year, 10);
      if (!isNaN(m) && !isNaN(y)) {
        const start = new Date(y, m - 1, 1);
        const end = new Date(y, m, 0, 23, 59, 59);
        rows = rows.filter((r) => {
          const d = r.date instanceof Date ? r.date : new Date(String(r.date));
          return d >= start && d <= end;
        });
      }
    }
    return NextResponse.json(rows);
  } catch (e) {
    console.error('GET /api/attendance error:', e);
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
    const ref = attendanceCollection().doc();
    await ref.set({
      ...body,
      schoolId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const created = await ref.get();
    return NextResponse.json(docToJson(created), { status: 201 });
  } catch (e) {
    console.error('POST /api/attendance error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
