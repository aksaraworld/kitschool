import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import { assertCourseSchool, canManageLms, loadCourseItems, parseLmsItemInput } from '@/lib/server/lms';
import { docToJson, lmsCourseItemsCollection, lmsCoursesCollection } from '@/lib/server/firebase-admin';
import { isMissingIndexError } from '@/lib/server/firestore-query';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const schoolId = getSchoolId(req, auth);
    const { id: courseId } = await params;

    const courseSnap = await lmsCoursesCollection().doc(courseId).get();
    if (!courseSnap.exists) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    const course = courseSnap.data() as { schoolId?: string; isPublished?: boolean };
    if (schoolId && course.schoolId !== schoolId) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const snap = await lmsCourseItemsCollection(courseId).orderBy('order', 'asc').get();
    const items = snap.docs.map((d) => docToJson(d));
    return NextResponse.json(items, { headers: { 'Cache-Control': 'private, max-age=120' } });
  } catch (e) {
    if (isMissingIndexError(e)) {
      const items = await loadCourseItems((await params).id);
      return NextResponse.json(items, { headers: { 'Cache-Control': 'private, max-age=120' } });
    }
    console.error('GET /api/lms/courses/[id]/items error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function POST(
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

    const { id: courseId } = await params;
    const check = await assertCourseSchool(courseId, schoolId);
    if (check.error) {
      return NextResponse.json({ message: check.error === 'Forbidden' ? 'Forbidden' : 'Not found' }, { status: check.error === 'Forbidden' ? 403 : 404 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = parseLmsItemInput(body);
    if ('error' in parsed) return NextResponse.json({ message: parsed.error }, { status: 400 });

    const existing = await lmsCourseItemsCollection(courseId).get();
    const order = parsed.order ?? existing.size;

    const now = new Date();
    const ref = lmsCourseItemsCollection(courseId).doc();
    await ref.set({
      type: parsed.type,
      title: parsed.title,
      contentUrl: parsed.contentUrl ?? null,
      contentBody: parsed.contentBody ?? null,
      order,
      createdAt: now,
      updatedAt: now,
    });

    await lmsCoursesCollection().doc(courseId).update({ updatedAt: now });
    return NextResponse.json(docToJson(await ref.get()), { status: 201 });
  } catch (e) {
    console.error('POST /api/lms/courses/[id]/items error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
