import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import { canManageBoarding, isBoardingSchoolDay } from '@/lib/server/boarding';
import {
  boardingPhoneLogsCollection,
  boardingRoomsCollection,
  schoolsCollection,
  usersCollection,
  docToJson,
} from '@/lib/server/firebase-admin';
import { UserRole } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const date = req.nextUrl.searchParams.get('date') ?? new Date().toISOString().slice(0, 10);
    const roomId = req.nextUrl.searchParams.get('roomId');
    const studentId = req.nextUrl.searchParams.get('studentId');

    const snap = await boardingPhoneLogsCollection().where('schoolId', '==', schoolId).get();
    let rows = snap.docs.map((d) => docToJson(d)).filter((r) => String(r.date).startsWith(date));

    if (roomId) rows = rows.filter((r) => r.roomId === roomId);

    if (auth.role === UserRole.PARENT) {
      const parentSnap = await usersCollection().doc(auth.uid).get();
      const children = new Set((parentSnap.data() as { children?: string[] })?.children ?? []);
      rows = rows.filter((r) => children.has(String(r.studentId)));
    } else if (auth.role === UserRole.STUDENT) {
      rows = rows.filter((r) => r.studentId === auth.uid);
    } else if (!canManageBoarding(auth)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    if (studentId) rows = rows.filter((r) => r.studentId === studentId);

    return NextResponse.json(rows);
  } catch (e) {
    console.error('GET /api/boarding/phone-logs error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

async function validatePhoneAction(
  schoolId: string,
  studentId: string,
  roomId: string,
  action: string
): Promise<string | null> {
  if (action !== 'returned') return null;

  const schoolSnap = await schoolsCollection().doc(schoolId).get();
  const policy = (schoolSnap.data() as { boardingConfig?: { phonePolicy?: { restrictOnSchoolDays?: boolean; roomCaptainCanHoldPhone?: boolean } } })
    ?.boardingConfig?.phonePolicy;
  if (!policy?.restrictOnSchoolDays || !isBoardingSchoolDay()) return null;

  const roomSnap = await boardingRoomsCollection().doc(roomId).get();
  const captainId = roomSnap.data()?.roomCaptainId;
  const studentSnap = await usersCollection().doc(studentId).get();
  const isCaptain = studentId === captainId || studentSnap.data()?.isRoomCaptain === true;

  if (policy.roomCaptainCanHoldPhone && isCaptain) return null;
  return 'HP tidak boleh dikembalikan pada hari sekolah (kebijakan asrama). Ketua kamar dapat memegang HP jika diizinkan.';
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth || !canManageBoarding(auth)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const action = body.action as string;
    const policyError = await validatePhoneAction(schoolId, body.studentId, body.roomId, action);
    if (policyError) return NextResponse.json({ message: policyError }, { status: 400 });

    const ref = boardingPhoneLogsCollection().doc();
    await ref.set({
      schoolId,
      roomId: body.roomId,
      studentId: body.studentId,
      action,
      heldByCaptainId: body.heldByCaptainId,
      date: body.date ?? new Date().toISOString().slice(0, 10),
      notes: body.notes ?? '',
      recordedBy: auth.uid,
      createdAt: new Date(),
    });
    return NextResponse.json(docToJson(await ref.get()), { status: 201 });
  } catch (e) {
    console.error('POST /api/boarding/phone-logs error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
