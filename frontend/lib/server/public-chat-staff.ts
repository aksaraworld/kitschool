/**
 * Staff access to public landing chat (CRM) — multiple handlers by role.
 */

import type { AuthUser } from '@/lib/server/auth-helpers';
import { hasAnyRole } from '@/lib/server/auth-helpers';
import { chatConversationsCollection, usersCollection } from '@/lib/server/firebase-admin';
import { CHAT_BROADCAST_STAFF_ROLES, hasAnyRole as hasAnyRoleClient } from '@/lib/types';

export function canHandlePublicChat(auth: AuthUser | null): boolean {
  return hasAnyRole(auth, CHAT_BROADCAST_STAFF_ROLES.map(String));
}

/** All active broadcast staff in school (CS pool). */
export async function getPublicChatHandlerIds(schoolId: string): Promise<string[]> {
  const ids = new Set<string>();
  for (let i = 0; i < CHAT_BROADCAST_STAFF_ROLES.length; i += 10) {
    const chunk = CHAT_BROADCAST_STAFF_ROLES.slice(i, i + 10).map(String);
    const snap = await usersCollection()
      .where('schoolId', '==', schoolId)
      .where('role', 'in', chunk)
      .get();
    for (const doc of snap.docs) {
      if ((doc.data() as { isActive?: boolean }).isActive === false) continue;
      ids.add(doc.id);
    }
  }
  return [...ids];
}

export type PublicConvData = {
  schoolId?: string;
  kind?: string;
  participantIds?: string[];
  participants?: Record<string, unknown>;
  unreadCount?: Record<string, number>;
  ticketId?: string;
};

export async function canAccessConversation(
  auth: AuthUser,
  conv: PublicConvData,
  schoolId: string
): Promise<boolean> {
  if (conv.schoolId !== schoolId) return false;
  if (conv.participantIds?.includes(auth.uid)) return true;
  if (conv.kind === 'public_inquiry' && canHandlePublicChat(auth)) return true;
  return false;
}

/** Join CS staff to public conversation so Firestore rules + realtime work. */
export async function ensureStaffJoinedPublicChat(
  conversationId: string,
  auth: AuthUser,
  schoolId: string
): Promise<void> {
  if (!canHandlePublicChat(auth)) return;

  const ref = chatConversationsCollection().doc(conversationId);
  const snap = await ref.get();
  if (!snap.exists) return;

  const conv = snap.data() as PublicConvData;
  if (conv.kind !== 'public_inquiry' || conv.schoolId !== schoolId) return;
  if (conv.participantIds?.includes(auth.uid)) return;

  const userSnap = await usersCollection().doc(auth.uid).get();
  if (!userSnap.exists) return;
  const u = userSnap.data() as { name?: string; role?: string; avatar?: string };

  const participantIds = [...(conv.participantIds ?? []), auth.uid];
  const participants = { ...(conv.participants ?? {}) };
  participants[auth.uid] = {
    uid: auth.uid,
    name: String(u.name ?? 'Staf'),
    role: String(u.role ?? 'staff'),
    ...(u.avatar ? { avatar: u.avatar } : {}),
  };
  const unreadCount = { ...(conv.unreadCount ?? {}), [auth.uid]: conv.unreadCount?.[auth.uid] ?? 0 };

  await ref.update({
    participantIds,
    participants,
    unreadCount,
    updatedAt: new Date(),
  });
}

export async function bumpPublicChatUnreadForStaff(
  schoolId: string,
  unreadCount: Record<string, number>
): Promise<Record<string, number>> {
  const next = { ...unreadCount };
  const handlerIds = await getPublicChatHandlerIds(schoolId);
  for (const id of handlerIds) {
    next[id] = (next[id] ?? 0) + 1;
  }
  return next;
}

export function userCanHandlePublicChat(user: { role?: string; roles?: string[] }): boolean {
  return hasAnyRoleClient(user, CHAT_BROADCAST_STAFF_ROLES.map(String));
}
