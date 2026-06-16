import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import { canManageBoarding, syncRoomAssignments } from '@/lib/server/boarding';
import { boardingRoomsCollection, usersCollection } from '@/lib/server/firebase-admin';

type BulkRow = {
  roomId: string;
  studentIds: string[];
  roomCaptainId?: string | null;
};

/**
 * POST /api/boarding/rooms/bulk-assign
 * Body: { assignments: BulkRow[] } or { csv: "roomId,studentId\\n..." }
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth || !canManageBoarding(auth)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    let assignments: BulkRow[] = Array.isArray(body.assignments) ? body.assignments : [];

    if (body.csv && typeof body.csv === 'string') {
      const byRoom = new Map<string, Set<string>>();
      for (const line of body.csv.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const [roomId, studentId] = trimmed.split(',').map((s: string) => s.trim());
        if (!roomId || !studentId) continue;
        if (!byRoom.has(roomId)) byRoom.set(roomId, new Set());
        byRoom.get(roomId)!.add(studentId);
      }
      assignments = [...byRoom.entries()].map(([roomId, ids]) => ({
        roomId,
        studentIds: [...ids],
      }));
    }

    if (!assignments.length) {
      return NextResponse.json({ message: 'No assignments provided' }, { status: 400 });
    }

    const results: { roomId: string; ok: boolean; message?: string; studentCount?: number }[] = [];

    for (const row of assignments) {
      const ref = boardingRoomsCollection().doc(row.roomId);
      const snap = await ref.get();
      if (!snap.exists || snap.data()?.schoolId !== schoolId) {
        results.push({ roomId: row.roomId, ok: false, message: 'Room not found' });
        continue;
      }

      const prev = snap.data() as {
        studentIds?: string[];
        roomCaptainId?: string;
        roomHeadStaffId?: string;
        capacity?: number;
      };

      const studentIds = [...new Set(row.studentIds.filter(Boolean))];
      const capacity = prev.capacity ?? 0;
      if (studentIds.length > capacity) {
        results.push({ roomId: row.roomId, ok: false, message: 'Exceeds capacity' });
        continue;
      }

      for (const sid of studentIds) {
        const u = await usersCollection().doc(sid).get();
        if (!u.exists || u.data()?.schoolId !== schoolId) {
          results.push({ roomId: row.roomId, ok: false, message: `Invalid student ${sid}` });
          continue;
        }
      }

      if (results.some((r) => r.roomId === row.roomId && !r.ok)) continue;

      const roomCaptainId =
        row.roomCaptainId !== undefined ? row.roomCaptainId : prev.roomCaptainId ?? studentIds[0] ?? null;

      await ref.set(
        {
          studentIds,
          roomCaptainId: roomCaptainId || null,
          updatedAt: new Date(),
        },
        { merge: true }
      );

      await syncRoomAssignments(row.roomId, schoolId, {
        studentIds,
        roomCaptainId,
        roomHeadStaffId: prev.roomHeadStaffId,
        previousStudentIds: prev.studentIds,
        previousCaptainId: prev.roomCaptainId,
        previousHeadStaffId: prev.roomHeadStaffId,
      });

      results.push({ roomId: row.roomId, ok: true, studentCount: studentIds.length });
    }

    const okCount = results.filter((r) => r.ok).length;
    return NextResponse.json({ results, updated: okCount }, { status: okCount ? 200 : 400 });
  } catch (e) {
    console.error('POST /api/boarding/rooms/bulk-assign error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
