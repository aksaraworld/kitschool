import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId, hasFullAccess } from '@/lib/server/auth-helpers';
import { boardingRoomsCollection, usersCollection, docToJson } from '@/lib/server/firebase-admin';
import { UserRole } from '@/lib/types';

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!hasFullAccess(auth) && auth.role !== UserRole.STAFF) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const ref = boardingRoomsCollection().doc(params.id);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    if (snap.data()?.schoolId !== schoolId) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const capacity = body.capacity !== undefined ? Number(body.capacity) : snap.data()?.capacity;
    const studentIds: string[] = body.studentIds ?? snap.data()?.studentIds ?? [];

    if (studentIds.length > capacity) {
      return NextResponse.json({ message: 'Jumlah santri melebihi kapasitas kamar' }, { status: 400 });
    }

    const update = { ...body, capacity, studentIds, updatedAt: new Date() };
    delete update._id;
    delete update.id;
    await ref.set(update, { merge: true });

    if (body.roomCaptainId) {
      await usersCollection().doc(body.roomCaptainId).set(
        { isRoomCaptain: true, boardingRoomId: params.id, canHoldPhone: true, updatedAt: new Date() },
        { merge: true }
      );
    }

    const updated = await ref.get();
    return NextResponse.json(docToJson(updated));
  } catch (e) {
    console.error('PUT /api/boarding/rooms/[id] error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
