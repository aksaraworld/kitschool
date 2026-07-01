import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import {
  canViewBk,
  canWriteCounseling,
  getAtRiskStudents,
} from '@/lib/server/bk';
import {
  counselingSessionsCollection,
  disciplineIncidentsCollection,
  disciplineWarningsCollection,
  docToJson,
  usersCollection,
} from '@/lib/server/firebase-admin';
import { parseLimit, RECENT_LIMIT, STUDENT_PICKER_LIMIT, todayDateString } from '@/lib/server/firestore-query';
import type { DisciplineWarning } from '@/lib/types';

const CACHE_HEADERS = { 'Cache-Control': 'private, max-age=30' };

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth || !canViewBk(auth)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const incidentLimit = parseLimit(req.nextUrl.searchParams.get('incidentLimit'), RECENT_LIMIT);
    const warningLimit = parseLimit(req.nextUrl.searchParams.get('warningLimit'), RECENT_LIMIT);
    const today = todayDateString();
    const canCounsel = await canWriteCounseling(auth);

    const [
      recentIncSnap,
      warnSnap,
      counselCountSnap,
      studentCountSnap,
      atRisk,
      studentSnap,
    ] = await Promise.all([
      disciplineIncidentsCollection()
        .where('schoolId', '==', schoolId)
        .where('status', '==', 'active')
        .orderBy('occurredAt', 'desc')
        .limit(incidentLimit)
        .get(),
      disciplineWarningsCollection()
        .where('schoolId', '==', schoolId)
        .orderBy('createdAt', 'desc')
        .limit(warningLimit)
        .get(),
      canCounsel
        ? counselingSessionsCollection().where('schoolId', '==', schoolId).count().get()
        : Promise.resolve(null),
      usersCollection().where('schoolId', '==', schoolId).where('role', '==', 'student').count().get(),
      getAtRiskStudents(schoolId, 10),
      usersCollection()
        .where('schoolId', '==', schoolId)
        .where('role', '==', 'student')
        .limit(STUDENT_PICKER_LIMIT)
        .get(),
    ]);

    const recentIncidents = recentIncSnap.docs.map((d) => docToJson(d));
    const warnings = warnSnap.docs.map((d) => docToJson(d) as unknown as DisciplineWarning);
    const todayIncidents = recentIncidents.filter((r) => String(r.occurredAt ?? '').startsWith(today));

    const pendingWarnings = warnings.filter(
      (w) => w.level >= 2 && w.status === 'sent' && !w.acknowledgedAt
    );
    const pendingMeetings = warnings.filter(
      (w) => w.level >= 3 && w.status !== 'meeting_completed'
    );

    let counseling: ReturnType<typeof docToJson>[] = [];
    if (canCounsel) {
      const counselSnap = await counselingSessionsCollection()
        .where('schoolId', '==', schoolId)
        .orderBy('sessionAt', 'desc')
        .limit(RECENT_LIMIT)
        .get();
      counseling = counselSnap.docs.map((d) => docToJson(d));
    }

    const students = studentSnap.docs
      .map((d) => {
        const data = d.data() as { name?: string };
        return { _id: d.id, name: data.name };
      })
      .sort((a, b) => String(a.name).localeCompare(String(b.name ?? '')));

    return NextResponse.json(
      {
        dashboard: {
          stats: {
            totalStudents: studentCountSnap.data().count,
            todayIncidents: todayIncidents.length,
            activeWarnings: warnings.filter((w) => w.status !== 'meeting_completed').length,
            pendingAcknowledgements: pendingWarnings.length,
            pendingMeetings: pendingMeetings.length,
            counselingSessions: counselCountSnap?.data().count ?? 0,
          },
          atRisk,
          recentIncidents,
          pendingWarnings: pendingWarnings.slice(0, 10),
        },
        incidents: recentIncidents,
        warnings,
        counseling,
        students,
      },
      { headers: CACHE_HEADERS }
    );
  } catch (e) {
    console.error('GET /api/bk/bootstrap error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
