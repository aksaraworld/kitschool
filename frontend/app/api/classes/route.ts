/**
 * Serverless GET/POST /api/classes – list/create classes (scoped by school).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId, hasAnyRole, hasFullAccess } from '@/lib/server/auth-helpers';
import {
  classesCollection,
  yearsCollection,
  majorsCollection,
  usersCollection,
  docToJson,
} from '@/lib/server/firebase-admin';
import { UserRole, ROLES_CAN_MANAGE_USERS } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const [classesSnap, yearsSnap, majorsSnap] = await Promise.all([
      classesCollection().where('schoolId', '==', schoolId).get(),
      yearsCollection().where('schoolId', '==', schoolId).get(),
      majorsCollection().where('schoolId', '==', schoolId).get(),
    ]);

    const yearMap = new Map<string, { _id: string; name: string }>();
    yearsSnap.docs.forEach((d) => {
      const o = docToJson(d) as { id: string; name?: string };
      yearMap.set(o.id, { _id: o.id, name: o.name ?? '' });
    });
    const majorMap = new Map<string, { _id: string; name: string }>();
    majorsSnap.docs.forEach((d) => {
      const o = docToJson(d) as { id: string; name?: string };
      majorMap.set(o.id, { _id: o.id, name: o.name ?? '' });
    });

    const teacherIds = [...new Set(classesSnap.docs.map((d) => (d.data() as { homeroomTeacherId?: string })?.homeroomTeacherId).filter(Boolean))] as string[];
    const presidentIds = [...new Set(classesSnap.docs.map((d) => (d.data() as { classPresidentId?: string })?.classPresidentId).filter(Boolean))] as string[];
    const allUserIds = [...new Set([...teacherIds, ...presidentIds])];
    const teacherMap = new Map<string, { _id: string; name: string }>();
    if (allUserIds.length > 0) {
      const teacherDocs = await Promise.all(allUserIds.map((tid) => usersCollection().doc(tid).get()));
      teacherDocs.forEach((d) => {
        if (d.exists) {
          const o = docToJson(d) as { id: string; name?: string };
          teacherMap.set(o.id, { _id: o.id, name: o.name ?? 'N/A' });
        }
      });
    }

    const hidePending = !hasFullAccess(auth);
    const classes = classesSnap.docs
      .filter((d) => {
        if (!hidePending) return true;
        const status = (d.data() as { approvalStatus?: string })?.approvalStatus;
        return status !== 'pending';
      })
      .map((d) => {
      const row = docToJson(d) as Record<string, unknown>;
      const yearId = row.yearId as string | undefined;
      const majorId = row.majorId as string | undefined;
      const homeroomId = row.homeroomTeacherId as string | undefined;
      const presidentId = row.classPresidentId as string | undefined;
      if (yearId) row.yearId = yearMap.get(yearId) ?? { _id: yearId, name: 'N/A' };
      if (majorId) row.majorId = majorMap.get(majorId) ?? { _id: majorId, name: 'N/A' };
      if (homeroomId) row.homeroomTeacherId = teacherMap.get(homeroomId) ?? { _id: homeroomId, name: 'N/A' };
      if (presidentId) row.classPresidentId = teacherMap.get(presidentId) ?? { _id: presidentId, name: 'N/A' };
      return row;
    });
    return NextResponse.json(classes);
  } catch (e) {
    console.error('GET /api/classes error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const canCreateDirect = hasFullAccess(auth) || hasAnyRole(auth, ROLES_CAN_MANAGE_USERS.map(String));
    if (!canCreateDirect && !hasAnyRole(auth, ['teacher', 'homeroom_teacher', 'guru_produktif', 'kaprodi', 'kepala_program_keahlian'])) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const approvalStatus = canCreateDirect ? 'approved' : 'pending';
    const data = {
      ...body,
      schoolId,
      approvalStatus,
      createdBy: auth.uid,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const ref = classesCollection().doc();
    await ref.set(data);
    const created = await ref.get();
    return NextResponse.json(docToJson(created), { status: 201 });
  } catch (e) {
    console.error('POST /api/classes error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
