import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import { canManageBoarding } from '@/lib/server/boarding';
import { boardingLeaveCollection, usersCollection, docToJson } from '@/lib/server/firebase-admin';
import { UserRole } from '@/lib/types';
import {
  notifyManagersNewLeaveRequest,
  notifyParentLeaveStatus,
} from '@/lib/server/boarding-notifications';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const status = req.nextUrl.searchParams.get('status');
    let snap;
    if (status) {
      snap = await boardingLeaveCollection()
        .where('schoolId', '==', schoolId)
        .where('status', '==', status)
        .orderBy('createdAt', 'desc')
        .limit(200)
        .get();
    } else {
      snap = await boardingLeaveCollection()
        .where('schoolId', '==', schoolId)
        .orderBy('createdAt', 'desc')
        .limit(200)
        .get();
    }
    let rows = snap.docs.map((d) => docToJson(d));

    if (auth.role === UserRole.PARENT) {
      rows = rows.filter((r) => r.parentId === auth.uid);
    }

    rows.sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')));
    return NextResponse.json(rows, { headers: { 'Cache-Control': 'private, max-age=30' } });
  } catch (e) {
    console.error('GET /api/boarding/leave error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const isParent = auth.role === UserRole.PARENT;

    if (isParent) {
      const studentId = body.studentId;
      if (!studentId) return NextResponse.json({ message: 'studentId required' }, { status: 400 });
      const student = await usersCollection().doc(studentId).get();
      const parentDoc = await usersCollection().doc(auth.uid).get();
      const children = (parentDoc.data() as { children?: string[] })?.children ?? [];
      if (!children.includes(studentId)) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      }
      const ref = boardingLeaveCollection().doc();
      await ref.set({
        schoolId,
        studentId,
        studentName: (student.data() as { name?: string })?.name,
        roomId: (student.data() as { boardingRoomId?: string })?.boardingRoomId,
        reason: body.reason ?? '',
        leaveDate: body.leaveDate,
        expectedReturn: body.expectedReturn,
        status: 'pending',
        parentId: auth.uid,
        createdBy: auth.uid,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const created = docToJson(await ref.get());
      notifyManagersNewLeaveRequest(schoolId, created, auth.uid).catch((e) =>
        console.error('leave notify managers:', e)
      );
      return NextResponse.json(created, { status: 201 });
    }

    if (!canManageBoarding(auth)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const ref = boardingLeaveCollection().doc();
    await ref.set({
      schoolId,
      studentId: body.studentId,
      studentName: body.studentName,
      roomId: body.roomId,
      reason: body.reason ?? '',
      leaveDate: body.leaveDate,
      expectedReturn: body.expectedReturn,
      status: body.status ?? 'pending',
      parentId: body.parentId,
      notes: body.notes,
      createdBy: auth.uid,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return NextResponse.json(docToJson(await ref.get()), { status: 201 });
  } catch (e) {
    console.error('POST /api/boarding/leave error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth || !canManageBoarding(auth)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const id = body.id;
    if (!id) return NextResponse.json({ message: 'id required' }, { status: 400 });

    const ref = boardingLeaveCollection().doc(id);
    const snap = await ref.get();
    if (!snap.exists || snap.data()?.schoolId !== schoolId) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }

    const update: Record<string, unknown> = { updatedAt: new Date(), approvedBy: auth.uid };
    if (body.status) update.status = body.status;
    if (body.actualReturn) update.actualReturn = body.actualReturn;
    if (body.notes != null) update.notes = body.notes;

    await ref.update(update);
    const updated = docToJson(await ref.get());
    const parentId = String(snap.data()?.parentId ?? '');
    if (body.status && parentId) {
      notifyParentLeaveStatus(
        schoolId,
        parentId,
        {
          studentName: String(snap.data()?.studentName ?? ''),
          leaveDate: String(snap.data()?.leaveDate ?? ''),
          status: body.status,
        },
        auth.uid
      ).catch((e) => console.error('leave notify parent:', e));
    }
    return NextResponse.json(updated);
  } catch (e) {
    console.error('PUT /api/boarding/leave error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
