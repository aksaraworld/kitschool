import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId, hasFullAccess } from '@/lib/server/auth-helpers';
import { boardingRoomsCollection, usersCollection, docToJson } from '@/lib/server/firebase-admin';
import { UserRole } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const areaId = req.nextUrl.searchParams.get('areaId');
    let q = boardingRoomsCollection().where('schoolId', '==', schoolId);
    if (areaId) q = q.where('areaId', '==', areaId);
    const snap = await q.get();
    return NextResponse.json(snap.docs.map((d) => docToJson(d)));
  } catch (e) {
    console.error('GET /api/boarding/rooms error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!hasFullAccess(auth) && auth.role !== UserRole.STAFF) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const capacity = Number(body.capacity) || 0;
    const studentIds: string[] = Array.isArray(body.studentIds) ? body.studentIds : [];

    if (studentIds.length > capacity) {
      return NextResponse.json({ message: 'Jumlah santri melebihi kapasitas kamar' }, { status: 400 });
    }

    const ref = boardingRoomsCollection().doc();
    await ref.set({
      schoolId,
      areaId: body.areaId,
      name: body.name,
      gender: body.gender,
      capacity,
      roomCaptainId: body.roomCaptainId || null,
      studentIds,
      floor: body.floor,
      isActive: body.isActive !== false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    if (body.roomCaptainId) {
      await usersCollection().doc(body.roomCaptainId).set(
        { isRoomCaptain: true, boardingRoomId: ref.id, updatedAt: new Date() },
        { merge: true }
      );
    }

    const snap = await ref.get();
    return NextResponse.json(docToJson(snap), { status: 201 });
  } catch (e) {
    console.error('POST /api/boarding/rooms error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
