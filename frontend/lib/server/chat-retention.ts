/**
 * Chat retention: archive messages older than 60 days per user/month, then purge.
 */

import {
  chatConversationsCollection,
  chatMessagesCollection,
  chatBackupsCollection,
  schoolsCollection,
  getFirestore,
} from '@/lib/server/firebase-admin';

export const CHAT_RETENTION_DAYS = 60;

type ConvData = {
  schoolId?: string;
  participantIds?: string[];
  participants?: Record<string, { name?: string }>;
};

type MessageData = {
  senderId?: string;
  text?: string;
  createdAt?: unknown;
  schoolId?: string;
};

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    return (value as { toDate: () => Date }).toDate();
  }
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

function yearMonthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function retentionCutoff(): Date {
  const d = new Date();
  d.setDate(d.getDate() - CHAT_RETENTION_DAYS);
  d.setHours(0, 0, 0, 0);
  return d;
}

function otherParticipant(
  conv: ConvData,
  userId: string
): { uid: string; name: string } | null {
  const id = conv.participantIds?.find((p) => p !== userId);
  if (!id) return null;
  const name = conv.participants?.[id]?.name ?? 'Pengguna';
  return { uid: id, name };
}

export async function runChatRetentionJob(): Promise<{
  conversationsProcessed: number;
  messagesArchived: number;
  messagesDeleted: number;
}> {
  const cutoff = retentionCutoff();
  let conversationsProcessed = 0;
  let messagesArchived = 0;
  let messagesDeleted = 0;

  const schoolsSnap = await schoolsCollection().get();
  const schoolIds = schoolsSnap.docs.map((d) => d.id);

  for (const schoolId of schoolIds) {
    const convSnap = await chatConversationsCollection()
      .where('schoolId', '==', schoolId)
      .get();

    for (const convDoc of convSnap.docs) {
      const convId = convDoc.id;
      const conv = convDoc.data() as ConvData;
      const participantIds = conv.participantIds ?? [];
      if (!participantIds.length) continue;

      const msgSnap = await chatMessagesCollection(convId).get();
      const expired = msgSnap.docs.filter((m) => {
        const created = toDate((m.data() as MessageData).createdAt);
        return created && created < cutoff;
      });

      if (!expired.length) continue;

      const db = getFirestore();
      let batch = db.batch();
      let batchOps = 0;

      const flush = async () => {
        if (batchOps === 0) return;
        await batch.commit();
        batch = db.batch();
        batchOps = 0;
      };

      for (const msgDoc of expired) {
        const msg = msgDoc.data() as MessageData;
        const created = toDate(msg.createdAt);
        if (!created) continue;

        const month = yearMonthKey(created);
        const createdIso = created.toISOString();

        for (const userId of participantIds) {
          const other = otherParticipant(conv, userId);
          const backupId = `${userId}_${month}`;
          const backupRef = chatBackupsCollection().doc(backupId);
          const entryRef = backupRef.collection('entries').doc(msgDoc.id);

          batch.set(
            backupRef,
            {
              userId,
              schoolId: conv.schoolId ?? schoolId,
              yearMonth: month,
              updatedAt: new Date(),
            },
            { merge: true }
          );

          batch.set(entryRef, {
            messageId: msgDoc.id,
            conversationId: convId,
            otherParticipantId: other?.uid ?? '',
            otherParticipantName: other?.name ?? 'Chat',
            senderId: String(msg.senderId ?? ''),
            direction: msg.senderId === userId ? 'sent' : 'received',
            text: String(msg.text ?? ''),
            createdAt: createdIso,
          });

          batchOps += 2;
          messagesArchived += 1;

          if (batchOps >= 400) await flush();
        }

        batch.delete(msgDoc.ref);
        batchOps += 1;
        messagesDeleted += 1;

        if (batchOps >= 400) await flush();
      }

      await flush();

      const remainingSnap = await chatMessagesCollection(convId)
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();

      if (remainingSnap.empty) {
        await chatConversationsCollection().doc(convId).delete();
      } else {
        const latest = remainingSnap.docs[0].data() as MessageData;
        const latestAt = toDate(latest.createdAt) ?? new Date();
        await chatConversationsCollection().doc(convId).update({
          lastMessage: String(latest.text ?? '').slice(0, 200),
          lastMessageAt: latestAt,
          lastSenderId: latest.senderId ?? '',
          updatedAt: new Date(),
        });
      }

      conversationsProcessed += 1;
    }
  }

  return { conversationsProcessed, messagesArchived, messagesDeleted };
}

export async function listUserChatBackupMonths(userId: string): Promise<
  { yearMonth: string; messageCount: number; updatedAt: string }[]
> {
  const snap = await chatBackupsCollection().where('userId', '==', userId).get();

  const rows = await Promise.all(
    snap.docs.map(async (doc) => {
      const data = doc.data() as { yearMonth?: string; updatedAt?: unknown };
      const entriesSnap = await doc.ref.collection('entries').count().get();
      const updated = toDate(data.updatedAt);
      return {
        yearMonth: String(data.yearMonth ?? doc.id.split('_').slice(1).join('_')),
        messageCount: entriesSnap.data().count,
        updatedAt: updated?.toISOString() ?? '',
      };
    })
  );

  return rows
    .filter((r) => r.messageCount > 0)
    .sort((a, b) => b.yearMonth.localeCompare(a.yearMonth));
}

export async function exportUserChatBackup(userId: string, yearMonth: string) {
  const backupId = `${userId}_${yearMonth}`;
  const backupRef = chatBackupsCollection().doc(backupId);
  const backupSnap = await backupRef.get();

  if (!backupSnap.exists) {
    return null;
  }

  const backup = backupSnap.data() as { userId?: string; schoolId?: string; yearMonth?: string };
  if (backup.userId !== userId) return null;

  const entriesSnap = await backupRef.collection('entries').orderBy('createdAt', 'asc').get();

  const messages = entriesSnap.docs.map((d) => {
    const e = d.data();
    return {
      conversationId: e.conversationId,
      with: e.otherParticipantName,
      direction: e.direction,
      text: e.text,
      createdAt: e.createdAt,
    };
  });

  return {
    userId,
    schoolId: backup.schoolId,
    yearMonth: backup.yearMonth ?? yearMonth,
    exportedAt: new Date().toISOString(),
    messageCount: messages.length,
    messages,
  };
}
