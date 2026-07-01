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
  roles?: string[];
  schoolId?: string;
}

function getBearerToken(req: NextRequest): string | null {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.slice(7).trim();
}

/** Warm-instance cache — avoids verifyIdToken + Firestore read on every API call in a burst. */
const authUserCache = new Map<string, { user: AuthUser; expiresAt: number }>();
const AUTH_CACHE_TTL_MS = 5 * 60_000;
const AUTH_CACHE_MAX = 200;

function getAuthCacheKey(token: string): string {
  return token.length > 48 ? token.slice(-48) : token;
}

function setAuthCache(key: string, user: AuthUser) {
  if (authUserCache.size >= AUTH_CACHE_MAX) {
    const oldest = authUserCache.keys().next().value;
    if (oldest) authUserCache.delete(oldest);
  }
  authUserCache.set(key, { user, expiresAt: Date.now() + AUTH_CACHE_TTL_MS });
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

  const cacheKey = getAuthCacheKey(idToken);
  const cached = authUserCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.user;
  }

  const decoded = await verifyIdToken(idToken);
  if (!decoded) return null;

  const claimRole = typeof decoded.role === 'string' ? decoded.role : '';
  const claimSchoolId = typeof decoded.schoolId === 'string' ? decoded.schoolId : undefined;
  const needsPrincipalLookup = claimRole === 'principal';

  const userDoc = await usersCollection().doc(decoded.uid).get();
  if (!userDoc.exists) return null;

  const data = userDoc.data() as Record<string, unknown>;
  if (data.isActive === false) return null;

  const rawSchoolId = data.schoolId ?? claimSchoolId;
  let schoolId =
    typeof rawSchoolId === 'string'
      ? rawSchoolId
      : rawSchoolId && typeof rawSchoolId === 'object' && 'id' in rawSchoolId
        ? String((rawSchoolId as { id: string }).id)
        : claimSchoolId;

  const role = (data.role as string) || claimRole || '';
  const roles = Array.isArray(data.roles) ? (data.roles as string[]) : undefined;

  if ((needsPrincipalLookup || role === 'principal' || roles?.includes('principal')) && data.email) {
    const email = String(data.email).trim();
    const schoolSnap = await schoolsCollection()
      .where('principalEmail', '==', email)
      .limit(1)
      .get();
    if (!schoolSnap.empty) schoolId = schoolSnap.docs[0].id;
  }

  const user: AuthUser = {
    uid: decoded.uid,
    email: String(data.email ?? decoded.email ?? ''),
    role,
    roles,
    schoolId,
  };
  setAuthCache(cacheKey, user);
  return user;
}

/** Check if auth user has any of the allowed roles. Supports multi-role staff. */
export function hasAnyRole(auth: AuthUser | null, allowed: string[]): boolean {
  if (!auth || !allowed.length) return false;
  const roles = auth.roles ?? [];
  const primary = auth.role ?? '';
  const effective = primary && !roles.includes(primary) ? [primary, ...roles] : roles.length ? roles : (primary ? [primary] : []);
  return effective.some((r) => allowed.includes(r));
}

/** School leadership with full management access. */
export function hasFullAccess(auth: AuthUser | null): boolean {
  return hasAnyRole(auth, ['principal', 'ketua_pesantren', 'ketua_yayasan']);
}
