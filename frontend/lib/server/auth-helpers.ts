/**
 * Server-only: get authenticated user from Next.js request (Bearer token).
 * Use in API route handlers.
 */

import { NextRequest } from 'next/server';
import { verifyIdToken, usersCollection, schoolsCollection } from '@/lib/server/firebase-admin';

export interface AuthUser {
  uid: string;
  email: string;
  role: string;
  schoolId?: string;
}

function getBearerToken(req: NextRequest): string | null {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.slice(7).trim();
}

/** Get school context. For Principal/Staff always use auth.schoolId so lists are never empty due to missing header. */
export function getSchoolId(req: NextRequest, auth: AuthUser | null): string | undefined {
  // Non–SaaS users: use their assigned school so API always has context (header can be unset on first load)
  if (auth?.schoolId && auth.role !== 'saas_admin') return auth.schoolId;
  const header = req.headers.get('x-school-id');
  if (header) return header.trim() || undefined;
  return auth?.schoolId;
}

/** Normalize Firestore schoolId (string or DocumentReference) to string. */
export function normalizeSchoolId(raw: unknown): string | undefined {
  if (typeof raw === 'string') return raw || undefined;
  if (raw && typeof raw === 'object' && 'id' in raw) return String((raw as { id: string }).id);
  return undefined;
}

/** Returns auth user from token + Firestore, or null if unauthenticated/invalid. */
export async function getAuthUser(req: NextRequest): Promise<AuthUser | null> {
  const idToken = getBearerToken(req);
  if (!idToken) return null;

  const decoded = await verifyIdToken(idToken);
  if (!decoded) return null;

  const userDoc = await usersCollection().doc(decoded.uid).get();
  if (!userDoc.exists) return null;

  const data = userDoc.data() as Record<string, unknown>;
  if (data.isActive === false) return null;

  // schoolId can be string or Firestore DocumentReference
  const rawSchoolId = data.schoolId;
  let schoolId =
    typeof rawSchoolId === 'string'
      ? rawSchoolId
      : rawSchoolId && typeof rawSchoolId === 'object' && 'id' in rawSchoolId
        ? String((rawSchoolId as { id: string }).id)
        : undefined;

  const role = (data.role as string) ?? '';
  // Principal: resolve school by principalEmail so API uses the same school as Firestore (user doc schoolId can be stale/wrong)
  if (role === 'principal' && data.email) {
    const email = String(data.email).trim();
    const schoolSnap = await schoolsCollection()
      .where('principalEmail', '==', email)
      .limit(1)
      .get();
    if (!schoolSnap.empty) schoolId = schoolSnap.docs[0].id;
  }

  return {
    uid: decoded.uid,
    email: String(data.email ?? decoded.email ?? ''),
    role,
    schoolId,
  };
}
