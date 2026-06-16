import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import { canManageBoarding, syncRoomAssignments } from '@/lib/server/boarding';
import { boardingRoomsCollection, docToJson } from '@/lib/server/firebase-admin';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser(req);
    if (!auth || !canManageBoarding(auth)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const { id } = await params;
    const ref = boardingRoomsCollection().doc(id);
    const snap = await ref.get();
    if (!snap.exists || snap.data()?.schoolId !== schoolId) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }

    const prev = snap.data() as {
      studentIds?: string[];
      roomCaptainId?: string;
      roomHeadStaffId?: string;
      capacity?: number;
    };

    const body = await req.json().catch(() => ({}));
    const capacity = body.capacity !== undefined ? Number(body.capacity) : prev.capacity ?? 0;
    const studentIds: string[] = body.studentIds ?? prev.studentIds ?? [];

    if (studentIds.length > capacity) {
      return NextResponse.json({ message: 'Jumlah santri melebihi kapasitas kamar' }, { status: 400 });
    }

    const roomCaptainId = body.roomCaptainId !== undefined ? body.roomCaptainId : prev.roomCaptainId;
    const roomHeadStaffId = body.roomHeadStaffId !== undefined ? body.roomHeadStaffId : prev.roomHeadStaffId;

    const update: Record<string, unknown> = {
      ...body,
      capacity,
      studentIds,
      roomCaptainId: roomCaptainId || null,
      roomHeadStaffId: roomHeadStaffId || null,
      updatedAt: new Date(),
    };
    delete update._id;
    delete update.id;

    await ref.set(update, { merge: true });

    await syncRoomAssignments(id, schoolId, {
      studentIds,
      roomCaptainId,
      roomHeadStaffId,
      previousStudentIds: prev.studentIds,
      previousCaptainId: prev.roomCaptainId,
      previousHeadStaffId: prev.roomHeadStaffId,
    });

    return NextResponse.json(docToJson(await ref.get()));
  } catch (e) {
    console.error('PUT /api/boarding/rooms/[id] error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser(req);
    if (!auth || !canManageBoarding(auth)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const { id } = await params;
    const ref = boardingRoomsCollection().doc(id);
    const snap = await ref.get();
    if (!snap.exists || snap.data()?.schoolId !== schoolId) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }

    const prev = snap.data() as { studentIds?: string[]; roomCaptainId?: string; roomHeadStaffId?: string };
    await ref.update({ isActive: false, studentIds: [], updatedAt: new Date() });
    await syncRoomAssignments(id, schoolId, {
      studentIds: [],
      roomCaptainId: null,
      roomHeadStaffId: null,
      previousStudentIds: prev.studentIds,
      previousCaptainId: prev.roomCaptainId,
      previousHeadStaffId: prev.roomHeadStaffId,
    });

    return NextResponse.json({ message: 'OK' });
  } catch (e) {
    console.error('DELETE /api/boarding/rooms/[id] error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
