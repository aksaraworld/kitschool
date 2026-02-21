/**
 * Serverless /api/users – list (GET) and create (POST). Uses Firestore + Firebase Auth.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, normalizeSchoolId } from '@/lib/server/auth-helpers';
import {
  getAuth,
  usersCollection,
  setUserRole,
} from '@/lib/server/firebase-admin';
import { UserRole } from '@/lib/types';

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
    const snapshot =
      auth.role !== UserRole.SAAS_ADMIN && auth.schoolId
        ? await col.where('schoolId', '==', auth.schoolId).get()
        : await col.get();

    const roleParam = req.nextUrl.searchParams.get('role');
    let docs = snapshot.docs;
    if (roleParam) {
      docs = docs.filter((d) => d.data()?.role === roleParam);
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
    if (
      auth.role !== UserRole.SAAS_ADMIN &&
      auth.role !== UserRole.STAFF &&
      auth.role !== UserRole.PRINCIPAL
    ) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const {
      email,
      password,
      name,
      role,
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
    const isStaffRole =
      role === UserRole.TEACHER ||
      role === UserRole.HOMEROOM_TEACHER ||
      role === UserRole.STAFF ||
      role === UserRole.PRINCIPAL ||
      role === UserRole.FINANCE;

    const userData: Record<string, unknown> = {
      email,
      name,
      role,
      schoolId: role !== UserRole.SAAS_ADMIN ? finalSchoolId : undefined,
      phone,
      isActive: true,
      nisn: isStudent ? nisn ?? studentId : undefined,
      admissionNo: isStudent ? admissionNo : undefined,
      nip: isStaffRole ? nip ?? teacherId ?? employeeId : undefined,
      studentId: isStudent ? nisn ?? studentId : undefined,
      teacherId: isStaffRole ? nip ?? teacherId ?? employeeId : undefined,
      employeeId: isStaffRole ? nip ?? teacherId ?? employeeId : undefined,
      classId,
      year,
      major,
      department,
      children,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await usersCollection().doc(userRecord.uid).set(userData);

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
