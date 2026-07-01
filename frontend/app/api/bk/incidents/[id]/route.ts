import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import { canManageBk, canViewBk } from '@/lib/server/bk';
import { disciplineIncidentsCollection, docToJson, usersCollection } from '@/lib/server/firebase-admin';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser(req);
    if (!auth || !canViewBk(auth)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    const { id } = await params;
    const doc = await disciplineIncidentsCollection().doc(id).get();
    if (!doc.exists) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    const row = docToJson(doc);
    const schoolId = getSchoolId(req, auth);
    if (schoolId && row.schoolId !== schoolId) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json(row);
  } catch (e) {
    console.error('GET /api/bk/incidents/[id] error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser(req);
    if (!auth || !canManageBk(auth)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const { id } = await params;
    const ref = disciplineIncidentsCollection().doc(id);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    const existing = snap.data() as { schoolId?: string };
    if (existing.schoolId !== schoolId) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? '');
    const managerSnap = await usersCollection().doc(auth.uid).get();
    const managerName = String((managerSnap.data() as { name?: string })?.name ?? 'Staf');
    const now = new Date();

    if (action === 'void') {
      await ref.update({
        status: 'voided',
        overriddenBy: auth.uid,
        overriddenByName: managerName,
        overrideReason: body.reason ? String(body.reason).trim() : 'Dibatalkan',
        updatedAt: now,
      });
      return NextResponse.json(docToJson(await ref.get()));
    }

    if (action === 'override_points') {
      const points = Math.abs(Number(body.points));
      if (!points || points < 1) {
        return NextResponse.json({ message: 'Poin tidak valid' }, { status: 400 });
      }
      await ref.update({
        points,
        status: 'overridden',
        overriddenBy: auth.uid,
        overriddenByName: managerName,
        overrideReason: body.reason ? String(body.reason).trim() : 'Override poin',
        updatedAt: now,
      });
      return NextResponse.json(docToJson(await ref.get()));
    }

    return NextResponse.json({ message: 'Aksi tidak dikenal' }, { status: 400 });
  } catch (e) {
    console.error('PUT /api/bk/incidents/[id] error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
