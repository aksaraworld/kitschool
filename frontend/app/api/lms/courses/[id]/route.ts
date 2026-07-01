import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import { assertCourseSchool, canManageLms, deleteCourseWithItems } from '@/lib/server/lms';
import { docToJson, lmsCoursesCollection } from '@/lib/server/firebase-admin';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const schoolId = getSchoolId(req, auth);
    const { id } = await params;

    const snap = await lmsCoursesCollection().doc(id).get();
    if (!snap.exists) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    const course = docToJson(snap);
    if (schoolId && course.schoolId !== schoolId) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json(course);
  } catch (e) {
    console.error('GET /api/lms/courses/[id] error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser(req);
    if (!auth || !canManageLms(auth)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const { id } = await params;
    const check = await assertCourseSchool(id, schoolId);
    if (check.error === 'Course not found') return NextResponse.json({ message: 'Not found' }, { status: 404 });
    if (check.error === 'Forbidden') return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (body.title != null) patch.title = String(body.title).trim();
    if (body.isPublished != null) patch.isPublished = Boolean(body.isPublished);

    await lmsCoursesCollection().doc(id).update(patch);
    return NextResponse.json(docToJson(await lmsCoursesCollection().doc(id).get()));
  } catch (e) {
    console.error('PATCH /api/lms/courses/[id] error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser(req);
    if (!auth || !canManageLms(auth)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const { id } = await params;
    const check = await assertCourseSchool(id, schoolId);
    if (check.error === 'Course not found') return NextResponse.json({ message: 'Not found' }, { status: 404 });
    if (check.error === 'Forbidden') return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    await deleteCourseWithItems(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/lms/courses/[id] error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
