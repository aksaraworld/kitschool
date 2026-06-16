import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import { canManageBoarding } from '@/lib/server/boarding';
import { boardingAttendanceCollection, usersCollection, docToJson } from '@/lib/server/firebase-admin';
import { UserRole } from '@/lib/types';

function attendanceDocId(
  schoolId: string,
  rec: { date: string; roomId: string; studentId: string; type: string; scheduleId?: string }
): string {
  const sched = rec.scheduleId || 'nightly';
  return `${schoolId}_${rec.date}_${rec.roomId}_${rec.studentId}_${rec.type}_${sched}`.replace(/[^\w-]/g, '_');
}

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const date = req.nextUrl.searchParams.get('date');
    const roomId = req.nextUrl.searchParams.get('roomId');
    const type = req.nextUrl.searchParams.get('type');
    const studentId = req.nextUrl.searchParams.get('studentId');

    const isManager = canManageBoarding(auth);

    if (auth.role === UserRole.PARENT) {
      const parentSnap = await usersCollection().doc(auth.uid).get();
      const children = (parentSnap.data() as { children?: string[] })?.children ?? [];
      if (studentId && !children.includes(studentId)) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      }
    } else if (auth.role === UserRole.STUDENT) {
      if (studentId && studentId !== auth.uid) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      }
    } else if (!isManager) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    let q = boardingAttendanceCollection().where('schoolId', '==', schoolId);
    if (date) q = q.where('date', '==', date) as ReturnType<typeof boardingAttendanceCollection>;
    if (roomId) q = q.where('roomId', '==', roomId) as ReturnType<typeof boardingAttendanceCollection>;

    const snap = await q.limit(500).get();
    let rows = snap.docs.map((d) => docToJson(d));
    if (type) rows = rows.filter((r) => r.type === type);

    if (auth.role === UserRole.PARENT) {
      const parentSnap = await usersCollection().doc(auth.uid).get();
      const children = new Set((parentSnap.data() as { children?: string[] })?.children ?? []);
      rows = rows.filter((r) => children.has(String(r.studentId)));
      if (studentId) rows = rows.filter((r) => r.studentId === studentId);
    } else if (auth.role === UserRole.STUDENT) {
      rows = rows.filter((r) => r.studentId === auth.uid);
    }

    return NextResponse.json(rows);
  } catch (e) {
    console.error('GET /api/boarding/attendance error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth || !canManageBoarding(auth)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const records = Array.isArray(body.records) ? body.records : [body];

    const saved = [];
    for (const rec of records) {
      const date = rec.date ?? new Date().toISOString().slice(0, 10);
      const type = rec.type ?? 'nightly';
      const row = {
        schoolId,
        roomId: rec.roomId,
        studentId: rec.studentId,
        date,
        type,
        status: rec.status ?? 'present',
        scheduleId: rec.scheduleId,
        notes: rec.notes ?? '',
        recordedBy: auth.uid,
        updatedAt: new Date(),
      };
      const docId = attendanceDocId(schoolId, {
        date,
        roomId: rec.roomId,
        studentId: rec.studentId,
        type,
        scheduleId: rec.scheduleId,
      });
      const ref = boardingAttendanceCollection().doc(docId);
      const existing = await ref.get();
      await ref.set({
        ...row,
        createdAt: existing.exists ? (existing.data()?.createdAt ?? new Date()) : new Date(),
      });
      saved.push(docToJson(await ref.get()));
    }

    return NextResponse.json(saved, { status: 201 });
  } catch (e) {
    console.error('POST /api/boarding/attendance error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
