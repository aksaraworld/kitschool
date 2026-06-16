/**
 * GET /api/boarding/summary – enriched areas, rooms, schedules + school config.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import {
  enrichRooms,
  getBoardingDashboard,
} from '@/lib/server/boarding';
import {
  schoolsCollection,
  boardingAreasCollection,
  boardingRoomsCollection,
  boardingSchedulesCollection,
  docToJson,
} from '@/lib/server/firebase-admin';
import type { BoardingRoom } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const [schoolSnap, areasSnap, roomsSnap, schedSnap, dashboard] = await Promise.all([
      schoolsCollection().doc(schoolId).get(),
      boardingAreasCollection().where('schoolId', '==', schoolId).get(),
      boardingRoomsCollection().where('schoolId', '==', schoolId).get(),
      boardingSchedulesCollection().where('schoolId', '==', schoolId).get(),
      getBoardingDashboard(schoolId),
    ]);

    const school = schoolSnap.exists ? docToJson(schoolSnap) : null;
    const boardingConfig = (school as { boardingConfig?: unknown } | null)?.boardingConfig;
    const areas = areasSnap.docs.map((d) => docToJson(d)).filter((a) => a.isActive !== false);
    const rawRooms = roomsSnap.docs
      .map((d) => docToJson(d) as unknown as BoardingRoom)
      .filter((r) => r.isActive !== false);
    const rooms = await enrichRooms(schoolId, rawRooms);
    const schedules = schedSnap.docs.map((d) => docToJson(d)).filter((s) => s.isActive !== false);

    return NextResponse.json(
      { school, boardingConfig, areas, rooms, schedules, dashboard },
      { headers: { 'Cache-Control': 'private, max-age=30' } }
    );
  } catch (e) {
    console.error('GET /api/boarding/summary error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
