import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import {
  canManageLms,
  resolveClassName,
} from '@/lib/server/lms';
import {
  classesCollection,
  docToJson,
  getFirestore,
  lmsSyllabusCollection,
  lmsSyllabusWeeksCollection,
  usersCollection,
} from '@/lib/server/firebase-admin';
import { LMS_DEFAULT_WEEKS } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth || !canManageLms(auth)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const subjectName = String(body.subjectName ?? '').trim();
    const classId = String(body.classId ?? '').trim();
    const yearId = String(body.yearId ?? '').trim();
    const totalWeeks = Math.min(Math.max(Number(body.totalWeeks) || LMS_DEFAULT_WEEKS, 1), 20);

    if (!subjectName) return NextResponse.json({ message: 'Nama mata pelajaran wajib' }, { status: 400 });
    if (!classId) return NextResponse.json({ message: 'Kelas wajib dipilih' }, { status: 400 });
    if (!yearId) return NextResponse.json({ message: 'Tahun ajaran wajib dipilih' }, { status: 400 });

    const classSnap = await classesCollection().doc(classId).get();
    if (!classSnap.exists || (classSnap.data() as { schoolId?: string })?.schoolId !== schoolId) {
      return NextResponse.json({ message: 'Kelas tidak valid' }, { status: 400 });
    }

    const teacherSnap = await usersCollection().doc(auth.uid).get();
    const teacherName = String((teacherSnap.data() as { name?: string })?.name ?? 'Guru');
    const className = await resolveClassName(classId);
    const now = new Date();
    const db = getFirestore();
    const batch = db.batch();
    const syllabusRef = lmsSyllabusCollection().doc();

    batch.set(syllabusRef, {
      schoolId,
      teacherId: auth.uid,
      teacherName,
      subjectId: body.subjectId ? String(body.subjectId) : null,
      subjectName,
      classId,
      className: className ?? (classSnap.data() as { name?: string })?.name,
      yearId,
      majorId: body.majorId ? String(body.majorId) : (classSnap.data() as { majorId?: string })?.majorId ?? null,
      description: body.description ? String(body.description).trim() : null,
      totalWeeks,
      isPublished: false,
      createdAt: now,
      updatedAt: now,
    });

    for (let weekNumber = 1; weekNumber <= totalWeeks; weekNumber++) {
      const weekRef = lmsSyllabusWeeksCollection(syllabusRef.id).doc(`w${String(weekNumber).padStart(2, '0')}`);
      batch.set(weekRef, {
        weekNumber,
        topic: '',
        learningObjectives: '',
        referencedLmsCourseId: null,
        updatedAt: now,
      });
    }

    await batch.commit();
    const created = await syllabusRef.get();
    return NextResponse.json(docToJson(created), { status: 201 });
  } catch (e) {
    console.error('POST /api/lms/syllabus/create error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
