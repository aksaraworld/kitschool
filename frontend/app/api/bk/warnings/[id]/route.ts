import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import { canManageBk, canViewBk } from '@/lib/server/bk';
import { disciplineWarningsCollection, docToJson } from '@/lib/server/firebase-admin';
import { UserRole } from '@/lib/types';

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
    const doc = await disciplineWarningsCollection().doc(id).get();
    if (!doc.exists) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    const row = docToJson(doc);
    const schoolId = getSchoolId(req, auth);
    if (schoolId && row.schoolId !== schoolId) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    if (auth.role === UserRole.PARENT && row.parentId !== auth.uid) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json(row);
  } catch (e) {
    console.error('GET /api/bk/warnings/[id] error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const { id } = await params;
    const ref = disciplineWarningsCollection().doc(id);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    const existing = snap.data() as { schoolId?: string; parentId?: string; level?: number };
    if (existing.schoolId !== schoolId) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? '');
    const now = new Date();

    if (action === 'acknowledge') {
      if (auth.role !== UserRole.PARENT || existing.parentId !== auth.uid) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      }
      const signature = String(body.parentSignature ?? body.signature ?? '').trim();
      if (existing.level && existing.level >= 2 && signature.length < 3) {
        return NextResponse.json({ message: 'Tanda tangan / konfirmasi wajib untuk SP' }, { status: 400 });
      }
      await ref.update({
        status: 'acknowledged',
        acknowledgedAt: now.toISOString(),
        parentSignature: signature || auth.uid,
        updatedAt: now,
      });
      return NextResponse.json(docToJson(await ref.get()));
    }

    if (!auth || !canManageBk(auth)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    if (action === 'schedule_meeting') {
      await ref.update({
        status: 'meeting_scheduled',
        meetingScheduledAt: body.meetingScheduledAt ?? now.toISOString(),
        meetingNotes: body.meetingNotes ? String(body.meetingNotes).trim() : null,
        updatedAt: now,
      });
      return NextResponse.json(docToJson(await ref.get()));
    }

    if (action === 'complete_meeting') {
      await ref.update({
        status: 'meeting_completed',
        meetingNotes: body.meetingNotes ? String(body.meetingNotes).trim() : null,
        updatedAt: now,
      });
      return NextResponse.json(docToJson(await ref.get()));
    }

    return NextResponse.json({ message: 'Aksi tidak dikenal' }, { status: 400 });
  } catch (e) {
    console.error('PUT /api/bk/warnings/[id] error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
