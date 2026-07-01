import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import { canViewGuestBook, canWriteGuestBook } from '@/lib/server/guest-book';
import { visitorLogsCollection, docToJson } from '@/lib/server/firebase-admin';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser(req);
    if (!auth || !canViewGuestBook(auth)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const { id } = await params;
    const snap = await visitorLogsCollection().doc(id).get();
    if (!snap.exists || snap.data()?.schoolId !== schoolId) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(docToJson(snap));
  } catch (e) {
    console.error('GET /api/guest-book/[id] error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser(req);
    if (!auth || !canWriteGuestBook(auth)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const { id } = await params;
    const ref = visitorLogsCollection().doc(id);
    const snap = await ref.get();
    if (!snap.exists || snap.data()?.schoolId !== schoolId) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const update: Record<string, unknown> = { updatedAt: new Date() };

    if (body.action === 'checkout') {
      update.status = 'completed';
      update.checkOutAt = new Date().toISOString();
    }

    if (body.notes != null) update.notes = String(body.notes);
    if (body.photoUrl != null) update.photoUrl = String(body.photoUrl);

    await ref.update(update);
    return NextResponse.json(docToJson(await ref.get()));
  } catch (e) {
    console.error('PUT /api/guest-book/[id] error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
