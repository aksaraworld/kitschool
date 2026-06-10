import type { ChatParticipant } from '@/lib/types';

export function getOtherParticipantFromData(
  row: Record<string, unknown>,
  currentUserId: string
): ChatParticipant | null {
  const raw = row.participants;
  if (!raw) return null;

  const list: ChatParticipant[] = Array.isArray(raw)
    ? (raw as ChatParticipant[])
    : Object.values(raw as Record<string, ChatParticipant>);

  return list.find((p) => p?.uid && p.uid !== currentUserId) ?? null;
}
