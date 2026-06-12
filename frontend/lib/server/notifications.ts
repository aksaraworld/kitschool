import type { AuthUser } from '@/lib/server/auth-helpers';
import { canUseChat } from '@/lib/server/chat-permissions';
import {
  chatConversationsCollection,
  communicationsCollection,
  ticketsCollection,
  docToJson,
} from '@/lib/server/firebase-admin';
import { getOtherParticipantFromData } from '@/lib/server/chat-notification-helpers';
import { TICKET_STATUS_LABELS, UserRole, type TicketStatus } from '@/lib/types';
import type { AppNotification } from '@/lib/types';

function toIso(value: unknown): string {
  if (!value) return new Date().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return String(value);
}

function isUnreadCommunication(row: Record<string, unknown>): boolean {
  if (row.read === true || row.isRead === true) return false;
  return true;
}

export async function getUserNotifications(
  auth: AuthUser,
  schoolId: string
): Promise<{ notifications: AppNotification[]; unreadCount: number }> {
  const notifications: AppNotification[] = [];

  if (canUseChat(auth)) {
    const chatSnap = await chatConversationsCollection()
      .where('schoolId', '==', schoolId)
      .where('participantIds', 'array-contains', auth.uid)
      .get();

    for (const doc of chatSnap.docs) {
      const row = docToJson(doc) as Record<string, unknown>;
      const unread = Number((row.unreadCount as Record<string, number> | undefined)?.[auth.uid] ?? 0);
      if (unread <= 0) continue;

      const other = getOtherParticipantFromData(row, auth.uid);
      const convId = String(row.id ?? row._id ?? doc.id);
      const lastMessage = String(row.lastMessage ?? 'Pesan baru');
      const createdAt = toIso(row.lastMessageAt ?? row.updatedAt ?? row.createdAt);

      notifications.push({
        id: `chat-${convId}`,
        type: 'chat',
        title: other?.name ?? 'Pesan baru',
        body: unread > 1 ? `${unread} pesan belum dibaca` : lastMessage,
        createdAt,
        href: `/messages?c=${convId}`,
        unread: true,
        count: unread,
        conversationId: convId,
      });
    }
  }

  if (auth.role === UserRole.PARENT) {
    const ticketSnap = await ticketsCollection()
      .where('schoolId', '==', schoolId)
      .where('creatorId', '==', auth.uid)
      .get();

    for (const doc of ticketSnap.docs) {
      const row = docToJson(doc) as Record<string, unknown>;
      const status = String(row.status ?? 'open') as TicketStatus;
      if (status === 'closed') continue;
      if (status === 'open') continue;

      notifications.push({
        id: `ticket-${doc.id}`,
        type: 'ticket',
        title: `Tiket ${row.ticketNumber}`,
        body:
          status === 'resolved'
            ? String(row.resolutionNote ?? 'Tiket Anda telah diselesaikan')
            : `${TICKET_STATUS_LABELS[status] ?? status}: ${row.subject}`,
        createdAt: toIso(row.updatedAt ?? row.createdAt),
        href: '/tickets',
        unread: true,
      });
    }
  }

  const commSnap = await communicationsCollection()
    .where('schoolId', '==', schoolId)
    .where('receiverId', '==', auth.uid)
    .limit(100)
    .get();

  for (const doc of commSnap.docs) {
    const row = docToJson(doc) as Record<string, unknown>;
    if (!isUnreadCommunication(row)) continue;

    const id = String(row.id ?? row._id ?? doc.id);
    const subject = String(row.subject ?? row.title ?? 'Pemberitahuan');
    const message = String(row.message ?? row.body ?? row.content ?? '');
    const createdAt = toIso(row.createdAt ?? row.updatedAt);

    notifications.push({
      id: `comm-${id}`,
      type: 'communication',
      title: subject,
      body: message || 'Anda memiliki pemberitahuan baru',
      createdAt,
      href: `/dashboard`,
      unread: true,
    });
  }

  notifications.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const unreadCount = notifications.reduce((sum, n) => sum + (n.count ?? 1), 0);

  return { notifications: notifications.slice(0, 50), unreadCount };
}
