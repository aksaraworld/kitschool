import type { AuthUser } from '@/lib/server/auth-helpers';
import { hasAnyRole, hasFullAccess } from '@/lib/server/auth-helpers';
import { GUEST_BOOK_VIEW_ROLES, GUEST_BOOK_WRITE_ROLES } from '@/lib/types';

export function canViewGuestBook(auth: AuthUser | null): boolean {
  return hasFullAccess(auth) || hasAnyRole(auth, GUEST_BOOK_VIEW_ROLES.map(String));
}

export function canWriteGuestBook(auth: AuthUser | null): boolean {
  return hasAnyRole(auth, GUEST_BOOK_WRITE_ROLES.map(String));
}

/** @deprecated use canWriteGuestBook */
export function canManageGuestBook(auth: AuthUser | null): boolean {
  return canWriteGuestBook(auth);
}
