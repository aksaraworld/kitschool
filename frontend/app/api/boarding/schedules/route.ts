import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId, hasFullAccess } from '@/lib/server/auth-helpers';
import { boardingSchedulesCollection, docToJson } from '@/lib/server/firebase-admin';
import { UserRole } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const snap = await boardingSchedulesCollection().where('schoolId', '==', schoolId).get();
    return NextResponse.json(snap.docs.map((d) => docToJson(d)));
  } catch (e) {
    console.error('GET /api/boarding/schedules error:', e);
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
    const ref = boardingSchedulesCollection().doc();
    await ref.set({
      schoolId,
      title: body.title,
      activityType: body.activityType || 'other',
      areaId: body.areaId,
      dayOfWeek: body.dayOfWeek ?? 0,
      startTime: body.startTime,
      endTime: body.endTime,
      description: body.description,
      isActive: body.isActive !== false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const snap = await ref.get();
    return NextResponse.json(docToJson(snap), { status: 201 });
  } catch (e) {
    console.error('POST /api/boarding/schedules error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
