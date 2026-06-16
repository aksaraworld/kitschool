import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import { canManageBoarding } from '@/lib/server/boarding';
import { boardingAreasCollection, docToJson } from '@/lib/server/firebase-admin';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const snap = await boardingAreasCollection().where('schoolId', '==', schoolId).get();
    return NextResponse.json(snap.docs.map((d) => docToJson(d)));
  } catch (e) {
    console.error('GET /api/boarding/areas error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!auth || !canManageBoarding(auth)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const ref = boardingAreasCollection().doc();
    await ref.set({
      schoolId,
      name: body.name,
      gender: body.gender,
      description: body.description,
      areaType: body.areaType || 'sleep',
      isActive: body.isActive !== false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const snap = await ref.get();
    return NextResponse.json(docToJson(snap), { status: 201 });
  } catch (e) {
    console.error('POST /api/boarding/areas error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
