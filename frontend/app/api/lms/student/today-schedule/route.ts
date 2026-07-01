import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import {
  getActiveYear,
  getCurrentWeekNumber,
  loadCourseForWeek,
  loadCourseItems,
  loadSyllabusWeek,
  normalizeWeeklySchedule,
  resolveTeacherName,
} from '@/lib/server/lms';
import {
  docToJson,
  schedulesCollection,
  usersCollection,
  yearsCollection,
} from '@/lib/server/firebase-admin';
import type { LmsItem, LmsTodayScheduleEntry, LmsTodaySchedulePayload } from '@/lib/types';
import { UserRole } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    let studentId = auth.uid;
    let classId: string | undefined;

    if (auth.role === UserRole.PARENT) {
      const childId = req.nextUrl.searchParams.get('studentId');
      if (!childId) return NextResponse.json({ message: 'studentId required for parent' }, { status: 400 });
      const parentSnap = await usersCollection().doc(auth.uid).get();
      const children = (parentSnap.data() as { children?: string[] })?.children ?? [];
      if (!children.includes(childId)) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      }
      studentId = childId;
    } else if (auth.role !== UserRole.STUDENT) {
      const qClass = req.nextUrl.searchParams.get('classId');
      const qStudent = req.nextUrl.searchParams.get('studentId');
      if (qStudent) studentId = qStudent;
      if (qClass) classId = qClass;
    }

    if (!classId) {
      const studentSnap = await usersCollection().doc(studentId).get();
      if (!studentSnap.exists) return NextResponse.json({ message: 'Student not found' }, { status: 404 });
      const student = studentSnap.data() as { classId?: string; schoolId?: string; role?: string };
      if (student.schoolId !== schoolId) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      }
      classId = student.classId;
    }

    if (!classId) {
      return NextResponse.json({
        date: new Date().toISOString().slice(0, 10),
        dayOfWeek: new Date().getDay(),
        weekNumber: 1,
        entries: [],
      } satisfies LmsTodaySchedulePayload);
    }

    const today = new Date();
    const dayOfWeek = today.getDay();
    const dateStr = today.toISOString().slice(0, 10);

    const activeYear = await getActiveYear(schoolId);
    let weekNumber = 1;
    let yearId: string | undefined;
    let yearName: string | undefined;

    if (activeYear) {
      yearId = String(activeYear._id ?? activeYear.id);
      yearName = String(activeYear.name ?? '');
      weekNumber = getCurrentWeekNumber(String(activeYear.startDate ?? ''), 16);
    }

    const schedSnap = await schedulesCollection()
      .where('schoolId', '==', schoolId)
      .where('classId', '==', classId)
      .where('type', '==', 'weekly_lesson')
      .where('dayOfWeek', '==', dayOfWeek)
      .get();

    let schedules = schedSnap.docs.map((d) => docToJson(d));

    if (schedules.length === 0) {
      const fallback = await schedulesCollection()
        .where('schoolId', '==', schoolId)
        .where('classId', '==', classId)
        .get();
      schedules = fallback.docs
        .map((d) => docToJson(d))
        .filter((r) => {
          if (r.type === 'weekly_lesson' && r.dayOfWeek === dayOfWeek) return true;
          const start = new Date(String(r.startDate ?? ''));
          return !Number.isNaN(start.getTime()) && start.toISOString().slice(0, 10) === dateStr;
        });
    }

    schedules.sort((a, b) => String(a.startTime ?? '').localeCompare(String(b.startTime ?? '')));

    const entries: LmsTodayScheduleEntry[] = [];

    for (const row of schedules.slice(0, 12)) {
      const slot = normalizeWeeklySchedule(row);
      const syllabusId = slot.activeSyllabusId;
      let weekTopic: string | undefined;
      let courseId: string | undefined;
      let courseTitle: string | undefined;
      let items: LmsItem[] = [];
      let hasQuiz = false;
      let hasMaterials = false;
      let learnUrl: string | undefined;
      let primaryAction: 'learn' | 'quiz' | null = null;

      if (syllabusId) {
        const weekDoc = await loadSyllabusWeek(syllabusId, weekNumber);
        weekTopic = weekDoc?.topic;
        const course = await loadCourseForWeek(
          schoolId,
          syllabusId,
          weekNumber,
          weekDoc?.referencedLmsCourseId
        );
        if (course?.isPublished) {
          courseId = course._id;
          courseTitle = course.title;
          items = await loadCourseItems(course._id);
          hasQuiz = items.some((i) => i.type === 'quiz');
          hasMaterials = items.some((i) => i.type === 'video' || i.type === 'document');
          const primary = items.find((i) => i.type === 'video') ?? items.find((i) => i.type === 'document') ?? items[0];
          if (primary) {
            learnUrl = `/lms/learn?course=${course._id}&item=${primary._id}`;
            primaryAction = primary.type === 'quiz' ? 'quiz' : 'learn';
          } else if (hasQuiz) {
            primaryAction = 'quiz';
            learnUrl = `/lms/learn?course=${course._id}`;
          }
        }
      }

      const teacherName = await resolveTeacherName(slot.teacherId);

      entries.push({
        scheduleId: slot.scheduleId,
        subjectName: slot.subjectName,
        startTime: slot.startTime,
        endTime: slot.endTime,
        teacherId: slot.teacherId,
        teacherName,
        classId: slot.classId,
        syllabusId,
        weekNumber,
        weekTopic,
        courseId,
        courseTitle,
        hasQuiz,
        hasMaterials,
        primaryAction,
        learnUrl,
        items,
      });
    }

    const payload: LmsTodaySchedulePayload = {
      date: dateStr,
      dayOfWeek,
      weekNumber,
      yearId,
      yearName,
      entries,
    };

    return NextResponse.json(payload, { headers: { 'Cache-Control': 'private, max-age=60' } });
  } catch (e) {
    console.error('GET /api/lms/student/today-schedule error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
