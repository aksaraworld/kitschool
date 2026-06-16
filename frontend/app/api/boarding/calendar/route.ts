import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import {
  expandBoardingSchedulesForMonth,
} from '@/lib/server/boarding';
import { boardingSchedulesCollection, docToJson } from '@/lib/server/firebase-admin';
import type { BoardingActivitySchedule } from '@/lib/types';

/** Calendar feed — recurring boarding activities expanded for a month. */
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const year = Number(req.nextUrl.searchParams.get('year') ?? new Date().getFullYear());
    const month = Number(req.nextUrl.searchParams.get('month') ?? new Date().getMonth());

    const snap = await boardingSchedulesCollection()
      .where('schoolId', '==', schoolId)
      .where('isActive', '==', true)
      .get();

    const schedules = snap.docs.map((d) => docToJson(d) as unknown as BoardingActivitySchedule);
    const events = expandBoardingSchedulesForMonth(schedules, year, month);
    return NextResponse.json(events);
  } catch (e) {
    console.error('GET /api/boarding/calendar error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
