/**
 * Serverless GET /api/auth/me – current user from Firebase ID token + Firestore.
 * Aksara-style: same-origin API on Vercel, no separate backend.
 */

import { NextRequest, NextResponse } from 'next/server';
import { normalizeSchoolId } from '@/lib/server/auth-helpers';
import { verifyIdToken, usersCollection, schoolsCollection } from '@/lib/server/firebase-admin';

function getBearerToken(req: NextRequest): string | null {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.slice(7).trim();
}

export async function GET(req: NextRequest) {
  try {
    const idToken = getBearerToken(req);
    if (!idToken) {
      return NextResponse.json({ message: 'No token provided' }, { status: 401 });
    }

    const decoded = await verifyIdToken(idToken);
    if (!decoded) {
      const hasAdminCreds =
        process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
        (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY);
      if (!hasAdminCreds) {
        const hint = process.env.VERCEL
          ? 'Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in Vercel Project Settings → Environment Variables.'
          : 'Add FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY to frontend .env.local.';
        console.error('GET /api/auth/me: Firebase Admin not configured.', hint);
        return NextResponse.json(
          { message: `Server misconfiguration: Firebase Admin credentials required. ${hint}` },
          { status: 503 }
        );
      }
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    const userDoc = await usersCollection().doc(decoded.uid).get();
    if (!userDoc.exists) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const data = userDoc.data()!;
    if (data.isActive === false) {
      return NextResponse.json({ message: 'Account is inactive' }, { status: 401 });
    }

    const schoolIdStr = normalizeSchoolId(data.schoolId);
    let school: { id: string; name: string; subscriptionStatus?: string; subscriptionPlan?: string } | null = null;
    if (schoolIdStr) {
      const schoolDoc = await schoolsCollection().doc(schoolIdStr).get();
      if (schoolDoc.exists) {
        const s = schoolDoc.data()!;
        school = {
          id: schoolDoc.id,
          name: s.name ?? '',
          subscriptionStatus: s.subscriptionStatus,
          subscriptionPlan: s.subscriptionPlan,
        };
      }
    }

    const user = {
      _id: decoded.uid,
      uid: decoded.uid,
      email: data.email ?? decoded.email ?? '',
      name: data.name ?? '',
      role: data.role ?? '',
      roles: Array.isArray(data.roles) ? data.roles : undefined,
      schoolId: schoolIdStr ?? undefined,
      school,
      isActive: data.isActive !== false,
      phone: data.phone,
      nisn: data.nisn ?? data.studentId,
      admissionNo: data.admissionNo,
      nip: data.nip ?? data.teacherId ?? data.employeeId,
      studentId: data.nisn ?? data.studentId,
      classId: data.classId,
      year: data.year,
      major: data.major,
      children: data.children,
      teacherId: data.teacherId,
      assignedClasses: data.assignedClasses,
      isHomeroom: data.isHomeroom,
      homeroomClassId: data.homeroomClassId,
      employeeId: data.employeeId,
      department: data.department,
    };

    return NextResponse.json(user);
  } catch (e) {
    console.error('GET /api/auth/me error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
