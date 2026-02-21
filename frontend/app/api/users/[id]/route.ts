/**
 * Serverless /api/users/[id] – get one (GET), update (PUT), deactivate (DELETE).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, hasAnyRole, hasFullAccess, getSchoolId, normalizeSchoolId } from '@/lib/server/auth-helpers';
import { getAuth, usersCollection, classesCollection } from '@/lib/server/firebase-admin';
import { UserRole, ROLES_CAN_MANAGE_USERS } from '@/lib/types';

function generateNisn(schoolId: string, existingNisns: Set<string>): string {
  let nisn = String(Math.floor(1000000000 + Math.random() * 900000000));
  let attempts = 0;
  while (existingNisns.has(nisn) && attempts < 100) {
    nisn = String(Math.floor(1000000000 + Math.random() * 900000000));
    attempts++;
  }
  return nisn;
}

function docToUser(doc: { id: string; data: () => unknown }): Record<string, unknown> {
  const data = (doc.data() ?? {}) as Record<string, unknown>;
  const createdAt = (data.createdAt as { toDate?: () => Date })?.toDate?.() ?? data.createdAt;
  const updatedAt = (data.updatedAt as { toDate?: () => Date })?.toDate?.() ?? data.updatedAt;
  const schoolId = normalizeSchoolId(data.schoolId);
  return {
    _id: doc.id,
    uid: doc.id,
    ...data,
    schoolId: schoolId ?? data.schoolId,
    createdAt,
    updatedAt,
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const isOwn = auth.uid === id;
    const isAdmin = auth.role === UserRole.SAAS_ADMIN || hasFullAccess(auth) || hasAnyRole(auth, ROLES_CAN_MANAGE_USERS.map(String));
    let isParentOfChild = false;
    if (auth.role === UserRole.PARENT && !isOwn && !isAdmin) {
      const parentDoc = await usersCollection().doc(auth.uid).get();
      const children = (parentDoc.data() as { children?: string[] })?.children ?? [];
      isParentOfChild = children.includes(id);
    }
    if (!isOwn && !isAdmin && !isParentOfChild) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const userDoc = await usersCollection().doc(id).get();
    if (!userDoc.exists) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const user = docToUser(userDoc);
    if (auth.role !== UserRole.SAAS_ADMIN && (user.schoolId as string) !== auth.schoolId) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(user);
  } catch (e) {
    console.error('GET /api/users/[id] error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const canEditOthers = auth.role === UserRole.SAAS_ADMIN || hasFullAccess(auth) || hasAnyRole(auth, ROLES_CAN_MANAGE_USERS.map(String));
    if (auth.uid !== id && !canEditOthers) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const existingDoc = await usersCollection().doc(id).get();
    if (!existingDoc.exists) return NextResponse.json({ message: 'User not found' }, { status: 404 });
    const existing = (existingDoc.data() ?? {}) as { classId?: string; homeroomClassId?: string; schoolId?: string; role?: string };

    const updateData: Record<string, unknown> = { ...body };
    delete updateData.uid;
    delete updateData._id;
    delete updateData.email;
    updateData.updatedAt = new Date();

    const toStr = (v: unknown): string | null => {
      if (typeof v === 'string') return v;
      const o = v as { _id?: string; id?: string } | null;
      if (o && (o._id || o.id)) return String(o._id ?? o.id);
      return null;
    };
    const role = body.role ?? existing.role ?? '';
    const rolesBody = body.roles;
    const isStudent = role === UserRole.STUDENT;
    const isStaffRole = !isStudent && role !== UserRole.PARENT;
    if (isStaffRole && Array.isArray(rolesBody)) {
      updateData.roles = [...new Set([role, ...rolesBody].filter(Boolean))];
    } else if (isStudent || role === UserRole.PARENT) {
      delete updateData.roles;
    }

    if (updateData.nisn !== undefined) {
      let nisnVal = String(updateData.nisn ?? '').trim();
      if (isStudent && !nisnVal) {
        const schoolId = getSchoolId(req, auth) ?? normalizeSchoolId(existing.schoolId);
        if (schoolId) {
          const studentsSnap = await usersCollection()
            .where('schoolId', '==', schoolId)
            .where('role', '==', UserRole.STUDENT)
            .get();
          const existing = new Set(
            studentsSnap.docs
              .filter((d) => d.id !== id)
              .map((d) => (d.data() as { nisn?: string; studentId?: string }).nisn ?? (d.data() as { studentId?: string }).studentId)
              .filter((x): x is string => Boolean(x))
          );
          nisnVal = generateNisn(schoolId, existing);
        }
        updateData.nisn = nisnVal;
      }
      updateData.studentId = isStudent ? (updateData.nisn ?? undefined) : undefined;
    }
    if (updateData.nip !== undefined) {
      if (isStaffRole) updateData.teacherId = updateData.employeeId = updateData.nip;
      else updateData.teacherId = updateData.employeeId = undefined;
    }


    // Sync Class.studentIds when student classId changes
    if (isStudent && updateData.classId !== undefined) {
      const newClassId = toStr(updateData.classId);
      const oldClassId = toStr(existing.classId);
      if (oldClassId !== newClassId) {
        const cols = classesCollection();
        if (oldClassId) {
          const oldClassRef = cols.doc(oldClassId);
          const oldSnap = await oldClassRef.get();
          if (oldSnap.exists) {
            const data = oldSnap.data() as { studentIds?: string[] };
            const ids = Array.isArray(data?.studentIds) ? data.studentIds.filter((sid) => sid !== id) : [];
            await oldClassRef.update({ studentIds: ids, updatedAt: new Date() });
          }
        }
        if (newClassId) {
          const newClassRef = cols.doc(newClassId);
          const newSnap = await newClassRef.get();
          if (newSnap.exists) {
            const data = newSnap.data() as { studentIds?: string[] };
            const ids = Array.isArray(data?.studentIds) ? data.studentIds : [];
            if (!ids.includes(id)) ids.push(id);
            await newClassRef.update({ studentIds: ids, updatedAt: new Date() });
          }
        }
      }
    }

    // Sync Class.homeroomTeacherId when teacher homeroomClassId changes
    const isTeacherRole = [UserRole.TEACHER, UserRole.HOMEROOM_TEACHER, UserRole.GURU_PRODUKTIF].includes(role as UserRole);
    if (isTeacherRole && updateData.homeroomClassId !== undefined) {
      const newClassId = toStr(updateData.homeroomClassId);
      const oldClassId = toStr(existing.homeroomClassId);
      const cols = classesCollection();
      if (oldClassId && oldClassId !== newClassId) {
        const oldClassRef = cols.doc(oldClassId);
        const oldSnap = await oldClassRef.get();
        if (oldSnap.exists) {
          const data = oldSnap.data() as { homeroomTeacherId?: string };
          if (data?.homeroomTeacherId === id) {
            await oldClassRef.update({ homeroomTeacherId: null, updatedAt: new Date() });
          }
        }
      }
      if (newClassId) {
        const newClassRef = cols.doc(newClassId);
        const newSnap = await newClassRef.get();
        if (newSnap.exists) {
          await newClassRef.update({ homeroomTeacherId: id, updatedAt: new Date() });
        }
      }
    }

    await usersCollection().doc(id).update(updateData);
    return NextResponse.json({ message: 'User updated successfully' });
  } catch (e) {
    console.error('PUT /api/users/[id] error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    if (auth.role !== UserRole.SAAS_ADMIN && !hasFullAccess(auth)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    await usersCollection().doc(id).update({
      isActive: false,
      updatedAt: new Date(),
    });

    try {
      await getAuth().updateUser(id, { disabled: true });
    } catch {
      // ignore if user already disabled
    }

    return NextResponse.json({ message: 'User deactivated successfully' });
  } catch (e) {
    console.error('DELETE /api/users/[id] error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
