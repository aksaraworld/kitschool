/**
 * GET /api/classes/years/[id]/top-students
 * Top 3 siswa per jurusan untuk tahun ajaran ini (berdasarkan nilai rata-rata).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId, hasFullAccess, hasAnyRole } from '@/lib/server/auth-helpers';
import {
  yearsCollection,
  classesCollection,
  gradesCollection,
  majorsCollection,
  usersCollection,
  docToJson,
} from '@/lib/server/firebase-admin';
import { UserRole } from '@/lib/types';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!hasFullAccess(auth) && !hasAnyRole(auth, [UserRole.STAFF])) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const { id: yearId } = await params;
    const yearRef = yearsCollection().doc(yearId);
    const yearSnap = await yearRef.get();
    if (!yearSnap.exists) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    const yearData = docToJson(yearSnap) as { schoolId?: string };
    if (yearData.schoolId !== schoolId) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const classesSnap = await classesCollection()
      .where('schoolId', '==', schoolId)
      .where('yearId', '==', yearId)
      .get();

    const classesRaw = classesSnap.docs.map((d) => {
      const data = d.data() as { majorId?: string; studentIds?: string[] };
      return { majorId: data.majorId, studentIds: data.studentIds ?? [] };
    });

    const majorToStudentIds = new Map<string, Set<string>>();
    for (const c of classesRaw) {
      const mid = c.majorId ?? '_no_major';
      let set = majorToStudentIds.get(mid);
      if (!set) {
        set = new Set();
        majorToStudentIds.set(mid, set);
      }
      c.studentIds.forEach((sid) => set!.add(sid));
    }

    const allStudentIds = new Set<string>();
    majorToStudentIds.forEach((set) => set.forEach((id) => allStudentIds.add(id)));

    const [gradesSnap, majorsSnap, userDocs] = await Promise.all([
      gradesCollection().where('schoolId', '==', schoolId).get(),
      majorsCollection().where('schoolId', '==', schoolId).get(),
      allStudentIds.size > 0
        ? Promise.all([...allStudentIds].map((uid) => usersCollection().doc(uid).get()))
        : Promise.resolve([]),
    ]);

    const majorMap = new Map<string, string>();
    majorsSnap.docs.forEach((d) => {
      const data = d.data() as { name?: string };
      majorMap.set(d.id, data.name ?? d.id);
    });
    majorMap.set('_no_major', 'Lainnya');

    const userMap = new Map<string, string>();
    userDocs.forEach((d) => {
      if (d.exists) {
        const o = docToJson(d) as { id: string; name?: string };
        userMap.set(o.id, o.name ?? o.id);
      }
    });

    const grades = gradesSnap.docs.map((d) => docToJson(d) as { studentId?: string; yearId?: string; marksObtained?: number });
    const gradeByStudent = new Map<string, number[]>();
    for (const g of grades) {
      const sid = g.studentId as string | undefined;
      if (!sid || !allStudentIds.has(sid)) continue;
      if (g.yearId != null && g.yearId !== yearId) continue;
      const arr = gradeByStudent.get(sid) ?? [];
      const m = Number(g.marksObtained);
      if (!isNaN(m)) arr.push(m);
      gradeByStudent.set(sid, arr);
    }

    const avgByStudent = new Map<string, number>();
    gradeByStudent.forEach((arr, sid) => {
      if (arr.length) avgByStudent.set(sid, arr.reduce((a, b) => a + b, 0) / arr.length);
    });

    const topPerMajor: { majorId: string; majorName: string; students: { studentId: string; name: string; avg: number; rank: number }[] }[] = [];
    for (const [majorId, studentIdSet] of majorToStudentIds) {
      const studentsWithAvg = [...studentIdSet]
        .map((sid) => ({ studentId: sid, avg: avgByStudent.get(sid) ?? 0 }))
        .filter((s) => s.avg > 0)
        .sort((a, b) => b.avg - a.avg)
        .slice(0, 3)
        .map((s, i) => ({
          studentId: s.studentId,
          name: userMap.get(s.studentId) ?? s.studentId,
          avg: Math.round(s.avg * 10) / 10,
          rank: i + 1,
        }));
      topPerMajor.push({
        majorId: majorId === '_no_major' ? '' : majorId,
        majorName: majorMap.get(majorId) ?? majorId,
        students: studentsWithAvg,
      });
    }

    topPerMajor.sort((a, b) => a.majorName.localeCompare(b.majorName));

    return NextResponse.json({ topPerMajor });
  } catch (e) {
    console.error('GET /api/classes/years/[id]/top-students error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
