/**
 * GET /api/dashboard/summary
 * Single efficient API for dashboard – Staff/Principal only.
 * Returns: active year, top students (grades/attendance), teachers, graph data.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId, hasFullAccess, hasAnyRole } from '@/lib/server/auth-helpers';
import { getUnitId, classMatchesUnit } from '@/lib/server/unit-helpers';
import {
  yearsCollection,
  classesCollection,
  usersCollection,
  gradesCollection,
  attendanceCollection,
  majorsCollection,
  scholarshipsCollection,
  schoolsCollection,
  docToJson,
} from '@/lib/server/firebase-admin';
import { UserRole } from '@/lib/types';

const TEACHER_ROLES = ['teacher', 'homeroom_teacher', 'guru_produktif', 'kaprodi'];

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!hasFullAccess(auth) && !hasAnyRole(auth, [UserRole.STAFF])) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });
    const unitId = getUnitId(req, auth);

    const [yearsSnap, classesSnap, usersSnap, gradesSnap, attSnap, majorsSnap, scholarSnap, schoolSnap] = await Promise.all([
      yearsCollection().where('schoolId', '==', schoolId).get(),
      classesCollection().where('schoolId', '==', schoolId).get(),
      usersCollection().where('schoolId', '==', schoolId).get(),
      gradesCollection().where('schoolId', '==', schoolId).get(),
      attendanceCollection().where('schoolId', '==', schoolId).get(),
      majorsCollection().where('schoolId', '==', schoolId).get(),
      scholarshipsCollection().where('schoolId', '==', schoolId).get(),
      schoolsCollection().doc(schoolId).get(),
    ]);
    const schoolData = schoolSnap.exists
      ? (schoolSnap.data() as {
          rankingMatrix?: { wUas?: number; wUts?: number; wPr?: number };
          units?: { id: string; name: string; label?: string }[];
        })
      : {};
    const schoolUnits = schoolData.units ?? [];
    const rm = schoolData.rankingMatrix ?? {};
    const wUas = Math.max(0, Math.min(100, Number(rm.wUas) || 50));
    const wUts = Math.max(0, Math.min(100, Number(rm.wUts) || 30));
    const wPr = Math.max(0, Math.min(100, Number(rm.wPr) || 20));
    const totalW = wUas + wUts + wPr || 1;
    const activeScholarshipPrograms = scholarSnap.docs
      .filter((d) => (d.data() as { isActive?: boolean }).isActive !== false)
      .map((d) => {
        const data = d.data() as { name?: string };
        return { _id: d.id, name: data.name ?? 'Beasiswa' };
      });

    const years = yearsSnap.docs.map((d) => docToJson(d) as { _id: string; name: string; isActive?: boolean; startDate?: unknown; endDate?: unknown });
    years.sort((a, b) => String(b.startDate || '').localeCompare(String(a.startDate || '')));
    const activeYear = years.find((y) => y.isActive) ?? years[0];
    const yearName = activeYear?.name ?? '-';
    const yearId = activeYear?._id;

    const classes = classesSnap.docs
      .filter((d) => !yearId || (d.data() as { yearId?: string }).yearId === yearId)
      .filter((d) =>
        !unitId || classMatchesUnit({ id: d.id, ...d.data() }, unitId, schoolUnits)
      )
      .map((d) => ({ id: d.id, ...d.data() } as { id: string; yearId?: string; majorId?: string; studentIds?: string[]; homeroomTeacherId?: string }));

    const studentIdsInYear = new Set<string>();
    const teacherIdsInYear = new Set<string>();
    const majorTeacherCount: Record<string, number> = { Lainnya: 0 };
    const majorMap = new Map<string, string>();
    majorsSnap.docs.forEach((d) => {
      const data = d.data() as { name?: string };
      majorMap.set(d.id, data.name ?? d.id);
    });

    for (const c of classes) {
      (c.studentIds ?? []).forEach((id: string) => studentIdsInYear.add(id));
      if (c.homeroomTeacherId) teacherIdsInYear.add(c.homeroomTeacherId);
      const majorName = c.majorId ? (majorMap.get(c.majorId) ?? 'Lainnya') : 'Lainnya';
      majorTeacherCount[majorName] = (majorTeacherCount[majorName] ?? 0) + (c.homeroomTeacherId ? 1 : 0);
    }
    if (majorTeacherCount.Lainnya === 0) delete majorTeacherCount.Lainnya;

    const users = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() } as { id: string; name?: string; role?: string }));
    const userMap = new Map(users.map((u) => [u.id, u]));

    const grades = gradesSnap.docs.map((d) => docToJson(d) as { studentId?: string; marksObtained?: number; componentKey?: string });
    const byStudent = new Map<string, { uas: number[]; uts: number[]; pr: number[]; all: number[] }>();
    for (const sid of studentIdsInYear) byStudent.set(sid, { uas: [], uts: [], pr: [], all: [] });
    for (const g of grades) {
      const sid = g.studentId as string | undefined;
      if (!sid || !studentIdsInYear.has(sid)) continue;
      const m = Number(g.marksObtained);
      if (isNaN(m)) continue;
      const row = byStudent.get(sid)!;
      row.all.push(m);
      const key = String(g.componentKey ?? '').toLowerCase();
      if (key.includes('uas')) row.uas.push(m);
      else if (key.includes('uts')) row.uts.push(m);
      else if (key.includes('pr') || key.includes('tugas')) row.pr.push(m);
    }
    const avgByStudent = new Map<string, number>();
    byStudent.forEach((v, sid) => {
      const au = v.uas.length ? v.uas.reduce((a, b) => a + b, 0) / v.uas.length : 0;
      const at = v.uts.length ? v.uts.reduce((a, b) => a + b, 0) / v.uts.length : 0;
      const ap = v.pr.length ? v.pr.reduce((a, b) => a + b, 0) / v.pr.length : 0;
      const hasMatrix = (v.uas.length || v.uts.length || v.pr.length) && totalW > 0;
      const score = hasMatrix
        ? (wUas / totalW) * au + (wUts / totalW) * at + (wPr / totalW) * ap
        : v.all.length ? v.all.reduce((a, b) => a + b, 0) / v.all.length : 0;
      if (v.all.length || hasMatrix) avgByStudent.set(sid, score);
    });
    const topByGrades = [...avgByStudent.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([sid, avg]) => ({ studentId: sid, studentName: userMap.get(sid)?.name ?? sid, avgGrade: Math.round(avg * 10) / 10 }));

    const attDocs = attSnap.docs.map((d) => docToJson(d) as { userId?: string; status?: string; type?: string });
    const presentByStudent = new Map<string, number>();
    const totalByStudent = new Map<string, number>();
    for (const a of attDocs) {
      const uid = a.userId as string | undefined;
      if (!uid || !studentIdsInYear.has(uid)) continue;
      if ((a.type as string) === 'teacher') continue;
      totalByStudent.set(uid, (totalByStudent.get(uid) ?? 0) + 1);
      const status = String(a.status ?? '').toLowerCase();
      if (status === 'present' || status === 'late') {
        presentByStudent.set(uid, (presentByStudent.get(uid) ?? 0) + 1);
      }
    }
    const topByAttendance = [...totalByStudent.entries()]
      .map(([sid, total]) => {
        const present = presentByStudent.get(sid) ?? 0;
        return {
          studentId: sid,
          studentName: userMap.get(sid)?.name ?? sid,
          presentCount: present,
          totalCount: total,
          rate: total > 0 ? Math.round((present / total) * 100) : 0,
        };
      })
      .filter((x) => x.totalCount > 0)
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 10);

    const teachers = users.filter(
      (u) => TEACHER_ROLES.includes(u.role ?? '') || (Array.isArray((u as any).roles) && (u as any).roles.some((r: string) => TEACHER_ROLES.includes(r)))
    );
    const teachersInYear = teachers.filter((t) => teacherIdsInYear.has(t.id));

    const graphData = Object.entries(majorTeacherCount)
      .filter(([, v]) => v > 0)
      .map(([major, count]) => {
        const majorId = majorsSnap.docs.find((d) => (d.data() as { name?: string }).name === major)?.id;
        return { label: major, value: count, majorId: majorId ?? '' };
      });

    return NextResponse.json({
      totalStudents: studentIdsInYear.size,
      activeYear: { _id: yearId, name: yearName },
      top10ByGrades: topByGrades.slice(0, 10),
      top10ByAttendance: topByAttendance,
      teacherCount: teachersInYear.length,
      graphTeachersByMajor: graphData,
      activeScholarshipPrograms,
      activeScholarshipCount: activeScholarshipPrograms.length,
    });
  } catch (e) {
    console.error('GET /api/dashboard/summary error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
