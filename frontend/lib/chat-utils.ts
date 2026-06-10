import type { ChatConversation, ChatParticipant, User } from '@/lib/types';

export function getCurrentUserId(user: User | null | undefined): string {
  if (!user) return '';
  return user._id || (user as User & { uid?: string }).uid || '';
}

export function getConversationParticipants(
  conv: ChatConversation | null | undefined
): ChatParticipant[] {
  if (!conv?.participants) return [];
  const raw = conv.participants;
  if (Array.isArray(raw)) {
    return raw.filter((p): p is ChatParticipant => Boolean(p?.uid));
  }
  return Object.values(raw).filter((p): p is ChatParticipant => Boolean(p?.uid));
}

export function getOtherParticipant(
  conv: ChatConversation | null | undefined,
  currentUserId: string
): ChatParticipant | null {
  return getConversationParticipants(conv).find((p) => p.uid !== currentUserId) ?? null;
}
