import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import {
  canViewBk,
  getDisciplineStatus,
  getStudentIncidents,
  getStudentWarnings,
} from '@/lib/server/bk';
import { disciplineStudentSummariesCollection, docToJson, usersCollection } from '@/lib/server/firebase-admin';
import { UserRole } from '@/lib/types';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { id: studentId } = await params;
    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const studentSnap = await usersCollection().doc(studentId).get();
    if (!studentSnap.exists) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    const student = studentSnap.data() as {
      name?: string;
      schoolId?: string;
      role?: string;
      parentId?: string;
    };
    if (student.schoolId !== schoolId) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    if (auth.role === UserRole.PARENT) {
      const parentSnap = await usersCollection().doc(auth.uid).get();
      const children = (parentSnap.data() as { children?: string[] })?.children ?? [];
      if (!children.includes(studentId) && student.parentId !== auth.uid) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      }
    } else if (!canViewBk(auth)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const [incidents, warnings, disciplineStatus, summarySnap] = await Promise.all([
      getStudentIncidents(schoolId, studentId, 50),
      getStudentWarnings(schoolId, studentId, 20),
      getDisciplineStatus(studentId),
      disciplineStudentSummariesCollection().doc(studentId).get(),
    ]);

    const summary = summarySnap.exists ? (summarySnap.data() as { totalDemerit?: number; totalMerit?: number; netPoints?: number }) : null;
    const totalDemerit = summary?.totalDemerit ?? 0;
    const totalMerit = summary?.totalMerit ?? 0;
    const netPoints = summary?.netPoints ?? 0;
    const highestWarningLevel = warnings.reduce((m, w) => Math.max(m, Number(w.level) || 0), 0);

    return NextResponse.json(
      {
        studentId,
        studentName: String(student.name ?? 'Siswa'),
        totalDemerit,
        totalMerit,
        netPoints,
        highestWarningLevel,
        disciplineStatus,
        recentIncidents: incidents.slice(0, 20),
        activeWarnings: warnings.filter((w) => w.status !== 'meeting_completed'),
        allWarnings: warnings,
      },
      { headers: { 'Cache-Control': 'private, max-age=30' } }
    );
  } catch (e) {
    console.error('GET /api/bk/students/[id] error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
