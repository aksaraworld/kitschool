/**
 * Public landing chat — anonymous visitors → customer service staff.
 */

import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import {
  chatConversationsCollection,
  chatMessagesCollection,
  publicChatRateLimitsCollection,
  publicChatSessionsCollection,
  schoolsCollection,
  usersCollection,
} from '@/lib/server/firebase-admin';
import { sendChatPush } from '@/lib/server/fcm';
import {
  createPublicChatCrmTicket,
  syncPublicChatMessageToTicket,
} from '@/lib/server/tickets';

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_SESSIONS_PER_IP_HOUR = 5;
const MAX_MESSAGES_PER_SESSION_HOUR = 30;
const MIN_MESSAGE_LEN = 2;
const MAX_MESSAGE_LEN = 500;

function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex').slice(0, 32);
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function guestId(sessionId: string): string {
  return `guest_${sessionId}`;
}

function conversationIdForPublic(sessionId: string): string {
  return `public_${sessionId}`;
}

function verifyToken(storedHash: string, token: string): boolean {
  try {
    const a = Buffer.from(storedHash);
    const b = Buffer.from(hashToken(token));
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

type PublicChatSession = {
  id: string;
  schoolId: string;
  schoolSlug: string;
  conversationId: string;
  tokenHash: string;
  visitorName: string;
  visitorContact: string;
  ipHash: string;
  messageCount: number;
  csStaffId: string;
  ticketId?: string;
  createdAt: FirebaseFirestore.Timestamp | Date;
  expiresAt: FirebaseFirestore.Timestamp | Date;
  isActive: boolean;
  updatedAt?: FirebaseFirestore.Timestamp | Date;
};

async function checkRateLimit(key: string, max: number, windowMs: number): Promise<boolean> {
  const ref = publicChatRateLimitsCollection().doc(key);
  const snap = await ref.get();
  const now = Date.now();

  if (!snap.exists) {
    await ref.set({ count: 1, windowStart: now });
    return true;
  }

  const data = snap.data() as { count?: number; windowStart?: number };
  const windowStart = data.windowStart ?? now;
  if (now - windowStart > windowMs) {
    await ref.set({ count: 1, windowStart: now });
    return true;
  }

  const count = (data.count ?? 0) + 1;
  if (count > max) return false;
  await ref.update({ count });
  return true;
}

export async function resolveSchoolBySlug(slug: string) {
  const snap = await schoolsCollection()
    .where('landingPage.enabled', '==', true)
    .where('landingPage.slug', '==', slug.toLowerCase())
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0]!;
  return { id: doc.id, data: doc.data() as Record<string, unknown> };
}

export async function createPublicChatSession(input: {
  schoolSlug: string;
  name: string;
  contact: string;
  ip: string;
  honeypot?: string;
}): Promise<
  | { token: string; sessionId: string; conversationId: string; ticketId: string; ticketNumber: string }
  | { error: string }
> {
  if (input.honeypot?.trim()) {
    return { error: 'Permintaan ditolak' };
  }

  const name = input.name.trim().slice(0, 80);
  const contact = input.contact.trim().slice(0, 80);
  if (name.length < 2) return { error: 'Nama minimal 2 karakter' };
  if (contact.length < 8) return { error: 'Nomor HP / kontak minimal 8 karakter' };

  const school = await resolveSchoolBySlug(input.schoolSlug);
  if (!school) return { error: 'Sekolah tidak ditemukan' };

  const landing = school.data.landingPage as { publicChatEnabled?: boolean } | undefined;
  if (!landing?.publicChatEnabled) {
    return { error: 'Live chat tidak aktif' };
  }

  const csStaffId = school.data.customerServiceStaffId as string | undefined;
  if (!csStaffId) return { error: 'Customer service belum dikonfigurasi' };

  const staffSnap = await usersCollection().doc(csStaffId).get();
  if (!staffSnap.exists) return { error: 'Akun customer service tidak ditemukan' };

  const ipKey = `${hashIp(input.ip)}_${school.id}`;
  const allowed = await checkRateLimit(`session_${ipKey}`, MAX_SESSIONS_PER_IP_HOUR, 60 * 60 * 1000);
  if (!allowed) return { error: 'Terlalu banyak percobaan. Coba lagi nanti.' };

  const sessionId = randomBytes(12).toString('hex');
  const token = randomBytes(24).toString('hex');
  const tokenHash = hashToken(token);
  const convId = conversationIdForPublic(sessionId);
  const guestUid = guestId(sessionId);
  const now = new Date();
  const staffData = staffSnap.data() as Record<string, unknown>;
  const csStaffName = String(staffData.name ?? 'Customer Service');

  const { ticketId, ticketNumber } = await createPublicChatCrmTicket({
    schoolId: school.id,
    sessionId,
    conversationId: convId,
    visitorName: name,
    visitorContact: contact,
    csStaffId,
    csStaffName,
  });

  await publicChatSessionsCollection().doc(sessionId).set({
    schoolId: school.id,
    schoolSlug: input.schoolSlug.toLowerCase(),
    conversationId: convId,
    tokenHash,
    visitorName: name,
    visitorContact: contact,
    ipHash: hashIp(input.ip),
    messageCount: 0,
    csStaffId,
    ticketId,
    ticketNumber,
    createdAt: now,
    expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
    isActive: true,
  });

  await chatConversationsCollection().doc(convId).set({
    schoolId: school.id,
    kind: 'public_inquiry',
    publicSessionId: sessionId,
    ticketId,
    ticketNumber,
    visitorName: name,
    visitorContact: contact,
    participantIds: [csStaffId, guestUid],
    participants: {
      [csStaffId]: {
        uid: csStaffId,
        name: String(staffData.name ?? 'Customer Service'),
        role: String(staffData.role ?? 'staff'),
      },
      [guestUid]: {
        uid: guestUid,
        name: `${name} (Pengunjung)`,
        role: 'visitor',
      },
    },
    unreadCount: { [csStaffId]: 0, [guestUid]: 0 },
    createdAt: now,
    updatedAt: now,
  });

  return { token, sessionId, conversationId: convId, ticketId, ticketNumber };
}

async function getSession(sessionId: string, token: string): Promise<PublicChatSession | null> {
  const snap = await publicChatSessionsCollection().doc(sessionId).get();
  if (!snap.exists) return null;
  const data = snap.data()!;
  if (!data.isActive) return null;
  if (!verifyToken(String(data.tokenHash), token)) return null;
  const expiresAt = data.expiresAt?.toDate?.() ?? new Date(String(data.expiresAt));
  if (expiresAt.getTime() < Date.now()) return null;
  return { id: snap.id, ...(data as Omit<PublicChatSession, 'id'>) };
}

export async function getPublicChatMessages(sessionId: string, token: string) {
  const session = await getSession(sessionId, token);
  if (!session) return { error: 'Sesi tidak valid' as const };

  const snap = await chatMessagesCollection(String(session.conversationId))
    .orderBy('createdAt', 'asc')
    .limit(100)
    .get();

  return {
    sessionId: session.id,
    conversationId: session.conversationId,
    visitorName: session.visitorName,
    messages: snap.docs.map((d) => {
      const data = d.data();
      return {
        _id: d.id,
        text: data.text,
        senderType: data.senderType ?? 'visitor',
        senderName: data.senderName,
        createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? new Date().toISOString(),
      };
    }),
  };
}

export async function sendPublicChatMessage(
  sessionId: string,
  token: string,
  text: string,
  ip: string
) {
  const trimmed = text.trim();
  if (trimmed.length < MIN_MESSAGE_LEN || trimmed.length > MAX_MESSAGE_LEN) {
    return { error: 'Pesan 2–500 karakter' };
  }

  const session = await getSession(sessionId, token);
  if (!session) return { error: 'Sesi tidak valid' };

  const msgKey = `msg_${session.id}_${hashIp(ip)}`;
  const allowed = await checkRateLimit(msgKey, MAX_MESSAGES_PER_SESSION_HOUR, 60 * 60 * 1000);
  if (!allowed) return { error: 'Terlalu banyak pesan. Coba lagi nanti.' };

  const convId = String(session.conversationId);
  const guestUid = guestId(String(session.id));
  const csStaffId = String(session.csStaffId);
  const now = new Date();

  const convRef = chatConversationsCollection().doc(convId);
  const convSnap = await convRef.get();
  const unread = { ...((convSnap.data()?.unreadCount as Record<string, number>) ?? {}) };
  unread[csStaffId] = (unread[csStaffId] ?? 0) + 1;

  const msgRef = chatMessagesCollection(convId).doc();
  await msgRef.set({
    conversationId: convId,
    schoolId: session.schoolId,
    senderId: guestUid,
    senderType: 'visitor',
    senderName: session.visitorName,
    text: trimmed,
    createdAt: now,
    readBy: {},
  });

  await convRef.update({
    lastMessage: trimmed.slice(0, 200),
    lastMessageAt: now,
    lastSenderId: guestUid,
    unreadCount: unread,
    updatedAt: now,
  });

  await publicChatSessionsCollection().doc(String(session.id)).update({
    messageCount: (session.messageCount ?? 0) + 1,
    updatedAt: now,
  });

  const ticketId = session.ticketId as string | undefined;
  if (ticketId) {
    void syncPublicChatMessageToTicket(
      ticketId,
      trimmed,
      (session.messageCount ?? 0) + 1
    );
  }

  void sendChatPush(csStaffId, {
    title: `${session.visitorName} (Pengunjung Web)`,
    body: trimmed.slice(0, 120),
    conversationId: convId,
  });

  return {
    message: {
      _id: msgRef.id,
      text: trimmed,
      senderType: 'visitor',
      senderName: session.visitorName,
      createdAt: now.toISOString(),
    },
  };
}
