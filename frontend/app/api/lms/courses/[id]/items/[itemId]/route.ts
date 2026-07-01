import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import { assertCourseSchool, canManageLms, parseLmsItemInput } from '@/lib/server/lms';
import { docToJson, lmsCourseItemsCollection } from '@/lib/server/firebase-admin';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const auth = await getAuthUser(req);
    if (!auth || !canManageLms(auth)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const { id: courseId, itemId } = await params;
    const check = await assertCourseSchool(courseId, schoolId);
    if (check.error) {
      return NextResponse.json({ message: check.error === 'Forbidden' ? 'Forbidden' : 'Not found' }, { status: check.error === 'Forbidden' ? 403 : 404 });
    }

    const itemRef = lmsCourseItemsCollection(courseId).doc(itemId);
    const itemSnap = await itemRef.get();
    if (!itemSnap.exists) return NextResponse.json({ message: 'Not found' }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const parsed = parseLmsItemInput(body);
    if ('error' in parsed) return NextResponse.json({ message: parsed.error }, { status: 400 });

    const now = new Date();
    await itemRef.update({
      type: parsed.type,
      title: parsed.title,
      contentUrl: parsed.contentUrl ?? null,
      contentBody: parsed.contentBody ?? null,
      ...(parsed.order != null ? { order: parsed.order } : {}),
      updatedAt: now,
    });

    return NextResponse.json(docToJson(await itemRef.get()));
  } catch (e) {
    console.error('PUT /api/lms/courses/[id]/items/[itemId] error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const auth = await getAuthUser(req);
    if (!auth || !canManageLms(auth)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const { id: courseId, itemId } = await params;
    const check = await assertCourseSchool(courseId, schoolId);
    if (check.error) {
      return NextResponse.json({ message: check.error === 'Forbidden' ? 'Forbidden' : 'Not found' }, { status: check.error === 'Forbidden' ? 403 : 404 });
    }

    const itemRef = lmsCourseItemsCollection(courseId).doc(itemId);
    if (!(await itemRef.get()).exists) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    await itemRef.delete();
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/lms/courses/[id]/items/[itemId] error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
