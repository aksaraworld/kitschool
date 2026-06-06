/**
 * GET /api/boarding/summary – areas, rooms, schedules + school config in one call.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import {
  schoolsCollection,
  boardingAreasCollection,
  boardingRoomsCollection,
  boardingSchedulesCollection,
  docToJson,
} from '@/lib/server/firebase-admin';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const [schoolSnap, areasSnap, roomsSnap, schedSnap] = await Promise.all([
      schoolsCollection().doc(schoolId).get(),
      boardingAreasCollection().where('schoolId', '==', schoolId).get(),
      boardingRoomsCollection().where('schoolId', '==', schoolId).get(),
      boardingSchedulesCollection().where('schoolId', '==', schoolId).get(),
    ]);

    const school = schoolSnap.exists ? docToJson(schoolSnap) : null;

    return NextResponse.json(
      {
        school,
        areas: areasSnap.docs.map((d) => docToJson(d)),
        rooms: roomsSnap.docs.map((d) => docToJson(d)),
        schedules: schedSnap.docs.map((d) => docToJson(d)),
      },
      { headers: { 'Cache-Control': 'private, max-age=60' } }
    );
  } catch (e) {
    console.error('GET /api/boarding/summary error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
