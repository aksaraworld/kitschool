/**
 * Serverless /api/users – list (GET) and create (POST). Uses Firestore + Firebase Auth.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, hasAnyRole, hasFullAccess, normalizeSchoolId } from '@/lib/server/auth-helpers';
import { getUnitId, loadSchoolUnits, recordMatchesUnit, resolveUnit } from '@/lib/server/unit-helpers';
import {
  getAuth,
  usersCollection,
  setUserRole,
  classesCollection,
} from '@/lib/server/firebase-admin';
import { UserRole, ROLES_CAN_MANAGE_USERS } from '@/lib/types';

/** Generate unique 10-digit NISN. */
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

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const col = usersCollection();
    const roleParam = req.nextUrl.searchParams.get('role');
    const parentOfParam = req.nextUrl.searchParams.get('parentOf');
    const majorIdParam = req.nextUrl.searchParams.get('majorId');
    const schoolIdForQuery = auth.role !== UserRole.SAAS_ADMIN && auth.schoolId ? auth.schoolId : null;

    let snapshot;
    if (schoolIdForQuery) {
      const q = col.where('schoolId', '==', schoolIdForQuery);
      snapshot = parentOfParam
        ? await q.where('children', 'array-contains', parentOfParam).get()
        : await q.get();
    } else {
      snapshot = await col.get();
    }
    let docs = snapshot.docs;
    if (roleParam) {
      docs = docs.filter((d) => {
        const d2 = d.data() as { role?: string; roles?: string[] };
        return d2?.role === roleParam || (Array.isArray(d2?.roles) && d2.roles.includes(roleParam));
      });
    }
    const unitId = getUnitId(req, auth);
    if (unitId && schoolIdForQuery) {
      const units = await loadSchoolUnits(schoolIdForQuery);
      const unit = resolveUnit(units, unitId);
      docs = docs.filter((d) => {
        const data = d.data() as Record<string, unknown>;
        const hasUnitMarker = data.unitId || data.jenjang || data.unitLabel;
        if (!hasUnitMarker) return true;
        return recordMatchesUnit(data, unitId, unit);
      });
    }
    if (majorIdParam && schoolIdForQuery) {
      const classesSnap = await classesCollection()
        .where('schoolId', '==', schoolIdForQuery)
        .where('majorId', '==', majorIdParam)
        .get();
      const classIds = new Set(classesSnap.docs.map((d) => d.id));
      if (classIds.size > 0) {
        docs = docs.filter((d) => {
          const data = d.data() as { homeroomClassId?: string; assignedClasses?: string[] };
          const homeroom = data.homeroomClassId && classIds.has(data.homeroomClassId);
          const assigned = Array.isArray(data.assignedClasses) && data.assignedClasses.some((c: string) => classIds.has(c));
          return homeroom || assigned;
        });
      }
    }
    const users = docs.map((doc) => docToUser(doc));

    return NextResponse.json(users);
  } catch (e) {
    console.error('GET /api/users error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    if (auth.role !== UserRole.SAAS_ADMIN && !hasFullAccess(auth) && !hasAnyRole(auth, ROLES_CAN_MANAGE_USERS.map(String))) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const {
      email,
      password,
      name,
      role,
      roles: rolesBody,
      phone,
      nisn,
      admissionNo,
      nip,
      studentId,
      teacherId,
      employeeId,
      classId,
      year,
      major,
      children,
      department,
      schoolId,
      homeroomClassId,
    } = body;

    if (!email || !password || !name || !role) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const finalSchoolId =
      auth.role === UserRole.SAAS_ADMIN ? schoolId || auth.schoolId : auth.schoolId;
    if (role !== UserRole.SAAS_ADMIN && !finalSchoolId) {
      return NextResponse.json({ message: 'schoolId is required for this role' }, { status: 400 });
    }

    const firebaseAuth = getAuth();
    const userRecord = await firebaseAuth.createUser({
      email,
      password,
      displayName: name,
      disabled: false,
    });

    await setUserRole(userRecord.uid, role, finalSchoolId);

    const isStudent = role === UserRole.STUDENT;
    let nisnVal = isStudent ? (nisn ?? studentId) : undefined;
    if (isStudent && !nisnVal?.toString().trim()) {
      const studentsSnap = await usersCollection()
        .where('schoolId', '==', finalSchoolId)
        .where('role', '==', UserRole.STUDENT)
        .get();
      const existing = new Set(
        studentsSnap.docs
          .map((d) => (d.data() as { nisn?: string; studentId?: string }).nisn ?? (d.data() as { studentId?: string }).studentId)
          .filter((x): x is string => Boolean(x))
      );
      nisnVal = generateNisn(finalSchoolId, existing);
    }
    const isStaffRole = !isStudent && role !== UserRole.PARENT;
    const staffRoles = isStaffRole && Array.isArray(rolesBody) && rolesBody.length
      ? [...new Set([role, ...rolesBody].filter(Boolean))]
      : undefined;

    const userData: Record<string, unknown> = {
      email,
      name,
      role,
      ...(staffRoles && { roles: staffRoles }),
      schoolId: role !== UserRole.SAAS_ADMIN ? finalSchoolId : undefined,
      phone,
      isActive: true,
      nisn: isStudent ? nisnVal : undefined,
      admissionNo: isStudent ? admissionNo : undefined,
      nip: isStaffRole ? nip ?? teacherId ?? employeeId : undefined,
      studentId: isStudent ? nisnVal : undefined,
      teacherId: isStaffRole ? nip ?? teacherId ?? employeeId : undefined,
      employeeId: isStaffRole ? nip ?? teacherId ?? employeeId : undefined,
      classId,
      year,
      major,
      department,
      children,
      homeroomClassId: [UserRole.TEACHER, UserRole.HOMEROOM_TEACHER, UserRole.GURU_PRODUKTIF].includes(role as UserRole) ? homeroomClassId : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await usersCollection().doc(userRecord.uid).set(userData);

    // Sync Class.studentIds when creating student with classId
    if (isStudent && classId) {
      const classRef = classesCollection().doc(classId);
      const classSnap = await classRef.get();
      if (classSnap.exists) {
        const data = classSnap.data() as { studentIds?: string[] };
        const ids = Array.isArray(data?.studentIds) ? data.studentIds : [];
        if (!ids.includes(userRecord.uid)) ids.push(userRecord.uid);
        await classRef.update({ studentIds: ids, updatedAt: new Date() });
      }
    }

    // Sync Class.homeroomTeacherId when creating teacher with homeroomClassId
    if ([UserRole.TEACHER, UserRole.HOMEROOM_TEACHER, UserRole.GURU_PRODUKTIF].includes(role as UserRole) && homeroomClassId) {
      const classRef = classesCollection().doc(homeroomClassId);
      const classSnap = await classRef.get();
      if (classSnap.exists) {
        await classRef.update({ homeroomTeacherId: userRecord.uid, updatedAt: new Date() });
      }
    }

    return NextResponse.json(
      { message: 'User created successfully', uid: userRecord.uid, email: userRecord.email },
      { status: 201 }
    );
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string };
    console.error('POST /api/users error:', e);
    if (err.code === 'auth/email-already-exists') {
      return NextResponse.json({ message: 'Email already exists' }, { status: 400 });
    }
    return NextResponse.json({ message: err.message || 'Server error' }, { status: 500 });
  }
}
