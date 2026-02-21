/**
 * POST /api/admin/assign-random
 * Randomly assigns: students→class, homeroom→class, class→year, class→major, schedule→teacher.
 * For Principal/Staff only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId, hasFullAccess, hasAnyRole } from '@/lib/server/auth-helpers';
import {
  getFirestore,
  usersCollection,
  classesCollection,
  yearsCollection,
  majorsCollection,
  schedulesCollection,
} from '@/lib/server/firebase-admin';
import { UserRole } from '@/lib/types';

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const BATCH_SIZE = 400;

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!hasFullAccess(auth) && !hasAnyRole(auth, [UserRole.STAFF])) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const teacherRoles = ['teacher', 'homeroom_teacher', 'guru_produktif', 'kaprodi', 'kepala_program_keahlian'];

    const [usersSnap, classesSnap, yearsSnap, majorsSnap, schedSnap] = await Promise.all([
      usersCollection().where('schoolId', '==', schoolId).get(),
      classesCollection().where('schoolId', '==', schoolId).get(),
      yearsCollection().where('schoolId', '==', schoolId).get(),
      majorsCollection().where('schoolId', '==', schoolId).get(),
      schedulesCollection().where('schoolId', '==', schoolId).get(),
    ]);

    const years = yearsSnap.docs.map((d) => d.id);
    const majors = majorsSnap.docs.map((d) => d.id);
    const majorNameMap = new Map<string, string>();
    majorsSnap.docs.forEach((d) => {
      const data = d.data() as { name?: string };
      majorNameMap.set(d.id, data.name ?? '');
    });
    const yearNameMap = new Map<string, string>();
    yearsSnap.docs.forEach((d) => {
      const data = d.data() as { name?: string };
      yearNameMap.set(d.id, data.name ?? '');
    });

    if (years.length === 0 || majors.length === 0) {
      return NextResponse.json(
        { message: 'Buat tahun ajaran dan jurusan terlebih dahulu' },
        { status: 400 }
      );
    }
    const classes = classesSnap.docs;
    if (classes.length === 0) {
      return NextResponse.json(
        { message: 'Buat kelas terlebih dahulu' },
        { status: 400 }
      );
    }

    const students = usersSnap.docs.filter((d) => (d.data() as { role?: string }).role === 'student');
    const teachers = usersSnap.docs.filter((d) => {
      const r = (d.data() as { role?: string; roles?: string[] }).role ?? '';
      const roles = (d.data() as { roles?: string[] }).roles ?? [];
      return teacherRoles.includes(r) || roles.some((r2) => teacherRoles.includes(r2 ?? ''));
    });
    const schedules = schedSnap.docs.filter((d) => (d.data() as { classId?: unknown }).classId);

    const stats = {
      studentsAssigned: 0,
      classesUpdated: 0,
      schedulesAssigned: 0,
      nisnGenerated: 0,
    };

    const shuffledClasses = shuffle(classes);
    const shuffledStudents = shuffle(students);

    // 1. Assign class→year, class→major, homeroom→class, studentIds
    const studentIdsByClass = new Map<string, string[]>();
    for (let i = 0; i < shuffledStudents.length; i++) {
      const classDoc = shuffledClasses[i % shuffledClasses.length];
      const arr = studentIdsByClass.get(classDoc.id) ?? [];
      arr.push(shuffledStudents[i].id);
      studentIdsByClass.set(classDoc.id, arr);
      stats.studentsAssigned++;
    }

    const db = getFirestore();
    let batch = db.batch();
    let opCount = 0;

    for (let i = 0; i < shuffledClasses.length; i++) {
      const classRef = shuffledClasses[i].ref;
      const yearId = years[i % years.length];
      const majorId = majors[i % majors.length];
      const teacher = teachers[i % teachers.length];
      const studentIds = studentIdsByClass.get(shuffledClasses[i].id) ?? [];
      batch.update(classRef, {
        yearId,
        majorId,
        homeroomTeacherId: teacher?.id ?? null,
        studentIds,
        updatedAt: new Date(),
      });
      opCount++;
      stats.classesUpdated++;
      if (opCount >= BATCH_SIZE) {
        await batch.commit();
        batch = db.batch();
        opCount = 0;
      }
    }

    // 2. Update user.classId, user.major (jurusan), user.year (tahun ajaran)
    for (let i = 0; i < shuffledStudents.length; i++) {
      const classDoc = shuffledClasses[i % shuffledClasses.length];
      const classData = classDoc.data() as { majorId?: string; yearId?: string };
      const majorName = classData.majorId ? majorNameMap.get(classData.majorId) : undefined;
      const yearName = classData.yearId ? yearNameMap.get(classData.yearId) : undefined;
      const studentRef = usersCollection().doc(shuffledStudents[i].id);
      batch.update(studentRef, {
        classId: classDoc.id,
        updatedAt: new Date(),
        ...(majorName && { major: majorName }),
        ...(yearName && { year: yearName }),
      });
      opCount++;
      if (opCount >= BATCH_SIZE) {
        await batch.commit();
        batch = db.batch();
        opCount = 0;
      }
    }

    // 3. Update teacher homeroomClassId (sync with class.homeroomTeacherId)
    const teacherToClass = new Map<string, string>();
    for (let i = 0; i < shuffledClasses.length; i++) {
      const teacher = teachers[i % teachers.length];
      if (teacher) teacherToClass.set(teacher.id, shuffledClasses[i].id);
    }
    for (const t of teachers) {
      const teacherRef = usersCollection().doc(t.id);
      batch.update(teacherRef, {
        homeroomClassId: teacherToClass.get(t.id) ?? null,
        updatedAt: new Date(),
      });
      opCount++;
      if (opCount >= BATCH_SIZE) {
        await batch.commit();
        batch = db.batch();
        opCount = 0;
      }
    }

    // 4. Assign schedule→teacher (createdBy)
    for (const sched of schedules) {
      const teacher = teachers[Math.floor(Math.random() * teachers.length)];
      if (teacher) {
        batch.update(sched.ref, { createdBy: teacher.id, updatedAt: new Date() });
        opCount++;
        stats.schedulesAssigned++;
        if (opCount >= BATCH_SIZE) {
          await batch.commit();
          batch = db.batch();
          opCount = 0;
        }
      }
    }

    if (opCount > 0) await batch.commit();

    // 5. Generate NISN for students without one
    const existingNisns = new Set<string>();
    const needNisn: { id: string }[] = [];
    for (const d of students) {
      const data = d.data() as { nisn?: string; studentId?: string };
      const n = (data.nisn ?? data.studentId ?? '').toString().trim();
      if (n) existingNisns.add(n);
      else needNisn.push({ id: d.id });
    }
    const genNisn = (): string => {
      let n = String(Math.floor(1000000000 + Math.random() * 900000000));
      let attempts = 0;
      while (existingNisns.has(n) && attempts < 100) {
        n = String(Math.floor(1000000000 + Math.random() * 900000000));
        attempts++;
      }
      return n;
    };
    for (const { id } of needNisn) {
      const nisn = genNisn();
      existingNisns.add(nisn);
      await usersCollection().doc(id).update({ nisn, studentId: nisn, updatedAt: new Date() });
      stats.nisnGenerated++;
    }

    return NextResponse.json({
      message: 'Assignments completed',
      stats: {
        ...stats,
        totalStudents: students.length,
        totalClasses: classes.length,
        totalSchedules: schedules.length,
        totalTeachers: teachers.length,
      },
    });
  } catch (e) {
    console.error('POST /api/admin/assign-random error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
