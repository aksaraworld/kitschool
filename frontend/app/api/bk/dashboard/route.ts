import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import {
  canViewBk,
} from '@/lib/server/bk';
import {
  counselingSessionsCollection,
  disciplineIncidentsCollection,
  disciplineWarningsCollection,
  docToJson,
  usersCollection,
} from '@/lib/server/firebase-admin';
import type { DisciplineWarning } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth || !canViewBk(auth)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const [incSnap, warnSnap, counselSnap, studentSnap] = await Promise.all([
      disciplineIncidentsCollection().where('schoolId', '==', schoolId).get(),
      disciplineWarningsCollection().where('schoolId', '==', schoolId).get(),
      counselingSessionsCollection().where('schoolId', '==', schoolId).get(),
      usersCollection().where('schoolId', '==', schoolId).where('role', '==', 'student').get(),
    ]);

    const incidents = incSnap.docs.map((d) => docToJson(d));
    const activeIncidents = incidents.filter((r) => r.status === 'active');
    const warnings = warnSnap.docs.map((d) => docToJson(d) as unknown as DisciplineWarning);
    const counseling = counselSnap.docs.map((d) => docToJson(d));

    const today = new Date().toISOString().slice(0, 10);
    const todayIncidents = activeIncidents.filter((r) => String(r.occurredAt ?? '').startsWith(today));

    const studentPoints = new Map<string, number>();
    for (const row of activeIncidents) {
      const sid = String(row.studentId);
      const pts = Number(row.points) || 0;
      const delta = row.recordType === 'merit' ? -pts : pts;
      studentPoints.set(sid, (studentPoints.get(sid) ?? 0) + delta);
    }
    const atRisk = [...studentPoints.entries()]
      .filter(([, net]) => net >= 10)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const studentNames = new Map<string, string>();
    for (const doc of studentSnap.docs) {
      const data = doc.data() as { name?: string };
      studentNames.set(doc.id, String(data.name ?? 'Siswa'));
    }

    const pendingWarnings = warnings.filter(
      (w) => w.level >= 2 && w.status === 'sent' && !w.acknowledgedAt
    );
    const pendingMeetings = warnings.filter(
      (w) => w.level >= 3 && w.status !== 'meeting_completed'
    );

    const recentIncidents = [...activeIncidents]
      .sort((a, b) => String(b.occurredAt ?? '').localeCompare(String(a.occurredAt ?? '')))
      .slice(0, 15);

    return NextResponse.json({
      stats: {
        totalStudents: studentSnap.size,
        todayIncidents: todayIncidents.length,
        activeWarnings: warnings.filter((w) => w.status !== 'meeting_completed').length,
        pendingAcknowledgements: pendingWarnings.length,
        pendingMeetings: pendingMeetings.length,
        counselingSessions: counseling.length,
      },
      atRisk: atRisk.map(([studentId, netPoints]) => ({
        studentId,
        studentName: studentNames.get(studentId) ?? 'Siswa',
        netPoints,
      })),
      recentIncidents,
      pendingWarnings: pendingWarnings.slice(0, 10),
    });
  } catch (e) {
    console.error('GET /api/bk/dashboard error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
