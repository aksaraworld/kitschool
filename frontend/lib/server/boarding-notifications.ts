/**
 * Boarding leave notifications — in-app communications + FCM push.
 */

import { communicationsCollection, usersCollection } from '@/lib/server/firebase-admin';
import { sendChatPush } from '@/lib/server/fcm';
import { BOARDING_MANAGE_ROLES, UserRole, getEffectiveRoles } from '@/lib/types';

export async function getBoardingManagerUserIds(schoolId: string): Promise<string[]> {
  const snap = await usersCollection().where('schoolId', '==', schoolId).get();
  const allowed = new Set(BOARDING_MANAGE_ROLES.map(String));
  const ids: string[] = [];
  for (const doc of snap.docs) {
    const data = doc.data() as { role?: string; roles?: string[] };
    const roles = getEffectiveRoles(data);
    if (roles.some((r) => allowed.has(r))) ids.push(doc.id);
  }
  return ids;
}

export async function sendBoardingNotification(opts: {
  schoolId: string;
  receiverId: string;
  title: string;
  body: string;
  href?: string;
  senderId?: string;
}): Promise<void> {
  const href = opts.href ?? '/boarding';
  const ref = communicationsCollection().doc();
  await ref.set({
    schoolId: opts.schoolId,
    receiverId: opts.receiverId,
    senderId: opts.senderId ?? 'system',
    subject: opts.title,
    message: opts.body,
    category: 'boarding',
    href,
    read: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  await sendChatPush(opts.receiverId, { title: opts.title, body: opts.body, href });
}

export async function notifyManagersNewLeaveRequest(
  schoolId: string,
  leave: { _id?: string; studentName?: string; leaveDate?: string; expectedReturn?: string; reason?: string },
  parentId: string
): Promise<void> {
  const managers = await getBoardingManagerUserIds(schoolId);
  const body = `${leave.studentName ?? 'Santri'} mengajukan izin ${leave.leaveDate} → ${leave.expectedReturn}. ${leave.reason ?? ''}`.trim();
  await Promise.all(
    managers.map((uid) =>
      sendBoardingNotification({
        schoolId,
        receiverId: uid,
        title: 'Pengajuan izin keluar asrama',
        body,
        href: '/boarding',
        senderId: parentId,
      })
    )
  );
}

const LEAVE_STATUS_LABELS: Record<string, string> = {
  approved: 'disetujui',
  rejected: 'ditolak',
  returned: 'sudah kembali ke asrama',
};

export async function notifyParentLeaveStatus(
  schoolId: string,
  parentId: string,
  leave: { studentName?: string; leaveDate?: string; status?: string },
  approverId: string
): Promise<void> {
  if (!parentId) return;
  const label = LEAVE_STATUS_LABELS[String(leave.status)] ?? leave.status ?? 'diperbarui';
  await sendBoardingNotification({
    schoolId,
    receiverId: parentId,
    title: `Izin keluar ${label}`,
    body: `Izin ${leave.studentName ?? 'anak Anda'} (${leave.leaveDate}) ${label}.`,
    href: '/children',
    senderId: approverId,
  });
}
