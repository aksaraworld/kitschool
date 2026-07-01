import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import { canWriteCounseling } from '@/lib/server/bk';
import { counselingSessionsCollection, docToJson, usersCollection } from '@/lib/server/firebase-admin';
import { parseLimit, DEFAULT_LIST_LIMIT } from '@/lib/server/firestore-query';
import type { BkEnvironment } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth || !(await canWriteCounseling(auth))) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const studentId = req.nextUrl.searchParams.get('studentId');
    const limit = parseLimit(req.nextUrl.searchParams.get('limit'), DEFAULT_LIST_LIMIT);

    let snap;
    if (studentId) {
      snap = await counselingSessionsCollection()
        .where('schoolId', '==', schoolId)
        .where('studentId', '==', studentId)
        .orderBy('sessionAt', 'desc')
        .limit(limit)
        .get();
    } else {
      snap = await counselingSessionsCollection()
        .where('schoolId', '==', schoolId)
        .orderBy('sessionAt', 'desc')
        .limit(limit)
        .get();
    }

    return NextResponse.json(snap.docs.map((d) => docToJson(d)), {
      headers: { 'Cache-Control': 'private, max-age=30' },
    });
  } catch (e) {
    console.error('GET /api/bk/counseling error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth || !(await canWriteCounseling(auth))) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const studentId = String(body.studentId ?? '').trim();
    const location = String(body.location ?? '').trim();
    const notes = String(body.notes ?? '').trim();
    if (!studentId) return NextResponse.json({ message: 'Siswa wajib dipilih' }, { status: 400 });
    if (!location) return NextResponse.json({ message: 'Lokasi wajib diisi' }, { status: 400 });
    if (notes.length < 5) return NextResponse.json({ message: 'Catatan konseling minimal 5 karakter' }, { status: 400 });

    const studentSnap = await usersCollection().doc(studentId).get();
    if (!studentSnap.exists) return NextResponse.json({ message: 'Siswa tidak ditemukan' }, { status: 404 });
    const student = studentSnap.data() as { name?: string; schoolId?: string; role?: string };
    if (student.schoolId !== schoolId || student.role !== 'student') {
      return NextResponse.json({ message: 'Siswa tidak valid' }, { status: 400 });
    }

    const counselorSnap = await usersCollection().doc(auth.uid).get();
    const counselorName = String((counselorSnap.data() as { name?: string })?.name ?? 'Konselor');
    const now = new Date();
    const ref = counselingSessionsCollection().doc();
    const environment = body.environment as BkEnvironment | undefined;

    await ref.set({
      schoolId,
      studentId,
      studentName: String(student.name ?? 'Siswa'),
      environment: environment && ['school', 'dormitory'].includes(environment) ? environment : null,
      sessionAt: body.sessionAt ?? now.toISOString(),
      location,
      counselorId: auth.uid,
      counselorName,
      notes,
      followUp: body.followUp ? String(body.followUp).trim() : null,
      incidentIds: Array.isArray(body.incidentIds) ? body.incidentIds.map(String) : [],
      isPrivate: true,
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json(docToJson(await ref.get()), { status: 201 });
  } catch (e) {
    console.error('POST /api/bk/counseling error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
