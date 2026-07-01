import { communicationsCollection } from '@/lib/server/firebase-admin';
import { sendChatPush } from '@/lib/server/fcm';
import type { BkWarningLevel } from '@/lib/types';
import { buildWarningMessage } from '@/lib/server/bk';

export async function sendBkNotification(opts: {
  schoolId: string;
  receiverId: string;
  title: string;
  body: string;
  href?: string;
  senderId?: string;
}): Promise<void> {
  const href = opts.href ?? '/children';
  const ref = communicationsCollection().doc();
  await ref.set({
    schoolId: opts.schoolId,
    receiverId: opts.receiverId,
    senderId: opts.senderId ?? 'system',
    subject: opts.title,
    message: opts.body,
    category: 'bk',
    href,
    read: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  await sendChatPush(opts.receiverId, { title: opts.title, body: opts.body, href });
}

export async function notifyParentWarning(opts: {
  schoolId: string;
  parentId: string;
  studentName: string;
  level: BkWarningLevel;
  netPoints: number;
  violationLabel?: string;
  warningId?: string;
  reporterId?: string;
}): Promise<void> {
  const { title, body } = buildWarningMessage(
    opts.level,
    opts.studentName,
    opts.netPoints,
    opts.violationLabel
  );
  const href = opts.warningId ? `/children?warning=${opts.warningId}` : '/children';
  await sendBkNotification({
    schoolId: opts.schoolId,
    receiverId: opts.parentId,
    title,
    body,
    href,
    senderId: opts.reporterId,
  });
}

export async function notifyParentIncident(opts: {
  schoolId: string;
  parentId: string;
  studentName: string;
  violationLabel: string;
  points: number;
  recordType: 'demerit' | 'merit';
  reporterId?: string;
}): Promise<void> {
  const isMerit = opts.recordType === 'merit';
  const title = isMerit ? 'Poin Prestasi / Perilaku Baik' : 'Catatan Perilaku';
  const body = isMerit
    ? `${opts.studentName} mendapat +${opts.points} poin positif: ${opts.violationLabel}.`
    : `${opts.studentName} dicatat pelanggaran: ${opts.violationLabel} (${opts.points} poin).`;
  await sendBkNotification({
    schoolId: opts.schoolId,
    receiverId: opts.parentId,
    title,
    body,
    href: '/children',
    senderId: opts.reporterId,
  });
}
