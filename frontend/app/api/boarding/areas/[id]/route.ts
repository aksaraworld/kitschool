import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import { canManageBoarding } from '@/lib/server/boarding';
import { boardingAreasCollection, docToJson } from '@/lib/server/firebase-admin';

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
    const ref = boardingAreasCollection().doc(id);
    const snap = await ref.get();
    if (!snap.exists || snap.data()?.schoolId !== schoolId) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (body.name != null) update.name = body.name;
    if (body.gender != null) update.gender = body.gender;
    if (body.description != null) update.description = body.description;
    if (body.areaType != null) update.areaType = body.areaType;
    if (body.isActive != null) update.isActive = body.isActive;

    await ref.update(update);
    return NextResponse.json(docToJson(await ref.get()));
  } catch (e) {
    console.error('PUT /api/boarding/areas/[id] error:', e);
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
    const ref = boardingAreasCollection().doc(id);
    const snap = await ref.get();
    if (!snap.exists || snap.data()?.schoolId !== schoolId) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }

    await ref.update({ isActive: false, updatedAt: new Date() });
    return NextResponse.json({ message: 'OK' });
  } catch (e) {
    console.error('DELETE /api/boarding/areas/[id] error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
