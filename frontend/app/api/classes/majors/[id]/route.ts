/**
 * Serverless GET/PUT/DELETE /api/classes/majors/[id].
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId, hasFullAccess } from '@/lib/server/auth-helpers';
import {
  majorsCollection,
  classesCollection,
  yearsCollection,
  schedulesCollection,
  usersCollection,
  docToJson,
} from '@/lib/server/firebase-admin';
import { UserRole } from '@/lib/types';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const { id } = await params;
    const majorRef = majorsCollection().doc(id);
    const majorSnap = await majorRef.get();
    if (!majorSnap.exists) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    const majorData = docToJson(majorSnap) as Record<string, unknown>;
    if ((majorData.schoolId as string) !== schoolId) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const classesSnap = await classesCollection()
      .where('schoolId', '==', schoolId)
      .where('majorId', '==', id)
      .get();

    const hidePending = !hasFullAccess(auth);
    const classesRaw = classesSnap.docs
      .filter((d) => {
        if (!hidePending) return true;
        const status = (d.data() as { approvalStatus?: string })?.approvalStatus;
        return status !== 'pending';
      })
      .map((d) => docToJson(d) as Record<string, unknown>);

    const yearIds = [...new Set(classesRaw.map((c) => c.yearId).filter(Boolean))] as string[];
    const yearsSnap = yearIds.length
      ? await yearsCollection().where('schoolId', '==', schoolId).get()
      : { docs: [] };
    const yearMap = new Map<string, { _id: string; name: string }>();
    yearsSnap.docs.forEach((d) => {
      const o = docToJson(d) as { id: string; name?: string };
      yearMap.set(o.id, { _id: o.id, name: o.name ?? '' });
    });

    const homeroomIds = [...new Set(classesRaw.map((c) => c.homeroomTeacherId).filter(Boolean))] as string[];
    const classIds = classesRaw.map((c) => c._id ?? c.id);
    let scheduleTeacherIds: string[] = [];
    if (classIds.length > 0) {
      const schedSnap = await schedulesCollection().where('schoolId', '==', schoolId).get();
      const scheds = schedSnap.docs
        .map((d) => docToJson(d) as { classId?: string; createdBy?: string })
        .filter((s) => s.classId && classIds.includes(s.classId));
      scheduleTeacherIds = [...new Set(scheds.map((s) => s.createdBy).filter(Boolean))] as string[];
    }
    const allTeacherIds = [...new Set([...homeroomIds, ...scheduleTeacherIds])];
    const teacherMap = new Map<string, { _id: string; name: string }>();
    if (allTeacherIds.length > 0) {
      const teacherDocs = await Promise.all(allTeacherIds.map((tid) => usersCollection().doc(tid).get()));
      teacherDocs.forEach((d) => {
        if (d.exists) {
          const o = docToJson(d) as { id: string; name?: string };
          teacherMap.set(o.id, { _id: o.id, name: o.name ?? 'N/A' });
        }
      });
    }
    const teachers = allTeacherIds.map((tid) => teacherMap.get(tid) ?? { _id: tid, name: 'N/A' });

    const classes = classesRaw.map((c) => {
      const yearId = c.yearId as string | undefined;
      const homeroomId = c.homeroomTeacherId as string | undefined;
      const studentIds = (c.studentIds as string[] | undefined) ?? [];
      return {
        ...c,
        yearId: yearId ? yearMap.get(yearId) ?? { _id: yearId, name: 'N/A' } : null,
        homeroomTeacherId: homeroomId ? teacherMap.get(homeroomId) ?? { _id: homeroomId, name: 'N/A' } : null,
        studentCount: studentIds.length,
      };
    });

    const totalStudents = classes.reduce((sum, c) => sum + ((c as { studentCount?: number }).studentCount ?? 0), 0);

    const stats = {
      totalClasses: classes.length,
      totalStudents,
      totalTeachers: teachers.length,
    };

    return NextResponse.json({
      major: majorData,
      classes,
      teachers,
      stats,
    });
  } catch (e) {
    console.error('GET /api/classes/majors/[id] error:', e);
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
    if (auth.role !== UserRole.STAFF && auth.role !== UserRole.PRINCIPAL) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const { id } = await params;
    const ref = majorsCollection().doc(id);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    if ((snap.data()?.schoolId as string) !== schoolId) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    await ref.update({ ...body, updatedAt: new Date() });
    const updated = await ref.get();
    return NextResponse.json(docToJson(updated));
  } catch (e) {
    console.error('PUT /api/classes/majors/[id] error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (auth.role !== UserRole.STAFF && auth.role !== UserRole.PRINCIPAL) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const { id } = await params;
    const ref = majorsCollection().doc(id);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    if ((snap.data()?.schoolId as string) !== schoolId) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    await ref.update({ isActive: false, updatedAt: new Date() });
    return NextResponse.json({ message: 'Deleted' });
  } catch (e) {
    console.error('DELETE /api/classes/majors/[id] error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
