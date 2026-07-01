import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import { canViewBk, getAtRiskStudents } from '@/lib/server/bk';
import {
  counselingSessionsCollection,
  disciplineIncidentsCollection,
  disciplineWarningsCollection,
  docToJson,
  usersCollection,
} from '@/lib/server/firebase-admin';
import { RECENT_LIMIT, todayDateString } from '@/lib/server/firestore-query';
import type { DisciplineWarning } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth || !canViewBk(auth)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const today = todayDateString();
    const { start, end } = { start: `${today}T00:00:00.000Z`, end: `${today}T23:59:59.999Z` };

    const [todayCountSnap, warnSnap, counselCountSnap, studentCountSnap, atRisk, recentIncSnap] =
      await Promise.all([
        disciplineIncidentsCollection()
          .where('schoolId', '==', schoolId)
          .where('status', '==', 'active')
          .where('occurredAt', '>=', start)
          .where('occurredAt', '<=', end)
          .count()
          .get(),
        disciplineWarningsCollection()
          .where('schoolId', '==', schoolId)
          .orderBy('createdAt', 'desc')
          .limit(RECENT_LIMIT)
          .get(),
        counselingSessionsCollection().where('schoolId', '==', schoolId).count().get(),
        usersCollection().where('schoolId', '==', schoolId).where('role', '==', 'student').count().get(),
        getAtRiskStudents(schoolId, 10),
        disciplineIncidentsCollection()
          .where('schoolId', '==', schoolId)
          .where('status', '==', 'active')
          .orderBy('occurredAt', 'desc')
          .limit(15)
          .get(),
      ]);

    const warnings = warnSnap.docs.map((d) => docToJson(d) as unknown as DisciplineWarning);
    const pendingWarnings = warnings.filter(
      (w) => w.level >= 2 && w.status === 'sent' && !w.acknowledgedAt
    );
    const pendingMeetings = warnings.filter(
      (w) => w.level >= 3 && w.status !== 'meeting_completed'
    );
    const recentIncidents = recentIncSnap.docs.map((d) => docToJson(d));

    return NextResponse.json(
      {
        stats: {
          totalStudents: studentCountSnap.data().count,
          todayIncidents: todayCountSnap.data().count,
          activeWarnings: warnings.filter((w) => w.status !== 'meeting_completed').length,
          pendingAcknowledgements: pendingWarnings.length,
          pendingMeetings: pendingMeetings.length,
          counselingSessions: counselCountSnap.data().count,
        },
        atRisk,
        recentIncidents,
        pendingWarnings: pendingWarnings.slice(0, 10),
      },
      { headers: { 'Cache-Control': 'private, max-age=30' } }
    );
  } catch (e) {
    console.error('GET /api/bk/dashboard error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
