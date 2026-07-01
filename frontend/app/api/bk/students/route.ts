import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import { canManageBk, canViewBk } from '@/lib/server/bk';
import { usersCollection } from '@/lib/server/firebase-admin';
import { parseLimit, STUDENT_PICKER_LIMIT } from '@/lib/server/firestore-query';
import type { BkDisciplineStatus } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth || !canViewBk(auth)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const q = req.nextUrl.searchParams.get('q')?.toLowerCase();
    const limit = parseLimit(req.nextUrl.searchParams.get('limit'), STUDENT_PICKER_LIMIT);

    const snap = await usersCollection()
      .where('schoolId', '==', schoolId)
      .where('role', '==', 'student')
      .limit(limit)
      .get();

    let students = snap.docs.map((d) => {
      const data = d.data() as { name?: string; classId?: string; boardingRoomId?: string };
      return { _id: d.id, name: data.name, classId: data.classId, boardingRoomId: data.boardingRoomId };
    });
    if (q) {
      students = students.filter((s) => String(s.name ?? '').toLowerCase().includes(q));
    }
    students.sort((a, b) => String(a.name).localeCompare(String(b.name)));
    return NextResponse.json(students, { headers: { 'Cache-Control': 'private, max-age=60' } });
  } catch (e) {
    console.error('GET /api/bk/students error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth || !canManageBk(auth)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const studentId = String(body.studentId ?? '').trim();
    const disciplineStatus = body.disciplineStatus as BkDisciplineStatus;
    if (!studentId) return NextResponse.json({ message: 'studentId wajib' }, { status: 400 });
    if (!['normal', 'suspension', 'expulsion'].includes(disciplineStatus)) {
      return NextResponse.json({ message: 'Status tidak valid' }, { status: 400 });
    }

    const ref = usersCollection().doc(studentId);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    const student = snap.data() as { schoolId?: string; role?: string };
    if (student.schoolId !== schoolId || student.role !== 'student') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    await ref.update({
      disciplineStatus,
      disciplineStatusNote: body.note ? String(body.note).trim() : null,
      disciplineStatusUpdatedAt: new Date(),
      disciplineStatusUpdatedBy: auth.uid,
      updatedAt: new Date(),
    });

    return NextResponse.json({ studentId, disciplineStatus });
  } catch (e) {
    console.error('PUT /api/bk/students error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
