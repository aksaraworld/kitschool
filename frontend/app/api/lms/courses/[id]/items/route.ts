import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import { docToJson, lmsCourseItemsCollection, lmsCoursesCollection } from '@/lib/server/firebase-admin';

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
    console.error('GET /api/lms/courses/[id]/items error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
