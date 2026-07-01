import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import { canManageLms, buildItemFromUrl } from '@/lib/server/lms';
import {
  docToJson,
  getFirestore,
  lmsCourseItemsCollection,
  lmsCoursesCollection,
  lmsSyllabusCollection,
  lmsSyllabusWeeksCollection,
} from '@/lib/server/firebase-admin';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const schoolId = getSchoolId(req, auth);
    const { id } = await params;

    const snap = await lmsSyllabusCollection().doc(id).get();
    if (!snap.exists) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    const syllabus = docToJson(snap);
    if (schoolId && syllabus.schoolId !== schoolId) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const weeksSnap = await lmsSyllabusWeeksCollection(id).orderBy('weekNumber', 'asc').get();
    const weeks = weeksSnap.docs.map((d) => docToJson(d));

    return NextResponse.json({ syllabus, weeks }, { headers: { 'Cache-Control': 'private, max-age=30' } });
  } catch (e) {
    console.error('GET /api/lms/syllabus/[id] error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function PUT(
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
    const ref = lmsSyllabusCollection().doc(id);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    const existing = snap.data() as { schoolId?: string; teacherId?: string };
    if (existing.schoolId !== schoolId) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const now = new Date();
    const db = getFirestore();
    const batch = db.batch();

    if (body.description != null || body.isPublished != null) {
      batch.update(ref, {
        ...(body.description != null ? { description: String(body.description) } : {}),
        ...(body.isPublished != null ? { isPublished: Boolean(body.isPublished) } : {}),
        updatedAt: now,
      });
    }

    const weeks = Array.isArray(body.weeks) ? body.weeks : [];
    for (const w of weeks) {
      const weekNumber = Number(w.weekNumber);
      if (!weekNumber || weekNumber < 1) continue;

      let referencedLmsCourseId = w.referencedLmsCourseId ? String(w.referencedLmsCourseId) : null;

      if (w.videoUrl && String(w.videoUrl).trim()) {
        const parsed = buildItemFromUrl(String(w.videoUrl), String(w.topic ?? `Minggu ${weekNumber}`), 'video');
        if (!parsed) {
          return NextResponse.json({ message: `URL video minggu ${weekNumber} tidak valid` }, { status: 400 });
        }
        const courseRef = referencedLmsCourseId
          ? lmsCoursesCollection().doc(referencedLmsCourseId)
          : lmsCoursesCollection().doc();
        if (!referencedLmsCourseId) {
          batch.set(courseRef, {
            schoolId,
            syllabusId: id,
            weekNumber,
            title: String(w.topic ?? `Materi Minggu ${weekNumber}`),
            isPublished: true,
            teacherId: auth.uid,
            createdAt: now,
            updatedAt: now,
          });
          referencedLmsCourseId = courseRef.id;
          const itemRef = lmsCourseItemsCollection(courseRef.id).doc();
          batch.set(itemRef, {
            type: parsed.type,
            title: String(w.topic ?? `Video Minggu ${weekNumber}`),
            contentUrl: parsed.contentUrl,
            order: 0,
            createdAt: now,
          });
        }
      }

      const weekRef = lmsSyllabusWeeksCollection(id).doc(`w${String(weekNumber).padStart(2, '0')}`);
      batch.set(
        weekRef,
        {
          weekNumber,
          topic: w.topic != null ? String(w.topic) : '',
          learningObjectives: w.learningObjectives != null ? String(w.learningObjectives) : '',
          referencedLmsCourseId,
          updatedAt: now,
        },
        { merge: true }
      );
    }

    await batch.commit();
    const weeksSnap = await lmsSyllabusWeeksCollection(id).orderBy('weekNumber', 'asc').get();
    return NextResponse.json({
      syllabus: docToJson(await ref.get()),
      weeks: weeksSnap.docs.map((d) => docToJson(d)),
    });
  } catch (e) {
    console.error('PUT /api/lms/syllabus/[id] error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
