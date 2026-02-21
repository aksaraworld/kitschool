/**
 * Serverless POST /api/auth/register – create user in Firebase Auth + Firestore.
 * Aksara-style: same-origin API on Vercel.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuth, getFirestore, setUserRole, usersCollection } from '@/lib/server/firebase-admin';
import { UserRole } from '@/lib/types';

const VALID_ROLES = Object.values(UserRole);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, name, role, schoolId, phone, nisn, admissionNo, nip, studentId, teacherId, employeeId, classId, year, major, department } = body;

    if (!email || !password || !name || !role) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }
    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json({ message: 'Invalid role' }, { status: 400 });
    }
    if (role !== UserRole.SAAS_ADMIN && !schoolId) {
      return NextResponse.json({ message: 'schoolId is required for this role' }, { status: 400 });
    }

    const auth = getAuth();
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
      disabled: false,
    });

    await setUserRole(userRecord.uid, role, role !== UserRole.SAAS_ADMIN ? schoolId : undefined);

    const isStudent = role === UserRole.STUDENT;
    const isStaffRole = [UserRole.TEACHER, UserRole.HOMEROOM_TEACHER, UserRole.STAFF, UserRole.PRINCIPAL, UserRole.FINANCE].includes(role);

    const userData: Record<string, unknown> = {
      email,
      name,
      role,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      phone: phone ?? null,
      nisn: isStudent ? (nisn ?? studentId) ?? null : null,
      admissionNo: isStudent ? (admissionNo ?? null) : null,
      nip: isStaffRole ? (nip ?? teacherId ?? employeeId) ?? null : null,
      studentId: isStudent ? (nisn ?? studentId) ?? null : null,
      teacherId: isStaffRole ? (nip ?? teacherId ?? employeeId) ?? null : null,
      employeeId: isStaffRole ? (nip ?? teacherId ?? employeeId) ?? null : null,
      classId: classId ?? null,
      year: year ?? null,
      major: major ?? null,
      department: department ?? null,
    };
    if (role !== UserRole.SAAS_ADMIN) userData.schoolId = schoolId;

    await usersCollection().doc(userRecord.uid).set(userData);

    return NextResponse.json(
      { message: 'User created successfully', uid: userRecord.uid, email: userRecord.email },
      { status: 201 }
    );
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    console.error('POST /api/auth/register error:', err);
    if (err?.code === 'auth/email-already-exists') {
      return NextResponse.json({ message: 'Email already exists' }, { status: 400 });
    }
    return NextResponse.json({ message: err?.message ?? 'Server error' }, { status: 500 });
  }
}
