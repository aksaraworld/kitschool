/**
 * Parent tickets — Masukan & Keluhan with role-based routing.
 */

import type { AuthUser } from '@/lib/server/auth-helpers';
import {
  TICKET_CATEGORY_ASSIGNEE_ROLES,
  TICKET_HANDLER_ROLES,
  TICKET_MANAGER_ROLES,
  UserRole,
  type TicketCategory,
  type TicketStats,
  type TicketStatus,
  hasAnyRole,
} from '@/lib/types';
import { sendChatPush } from '@/lib/server/fcm';
import { schoolsCollection, ticketsCollection, usersCollection, docToJson } from '@/lib/server/firebase-admin';

const VALID_CATEGORIES: TicketCategory[] = [
  'academic',
  'discipline',
  'facility',
  'finance',
  'boarding',
  'general',
];

export function canCreateTicket(auth: AuthUser): boolean {
  return auth.role === UserRole.PARENT;
}

export function canHandleTickets(auth: AuthUser): boolean {
  return hasAnyRole(auth, TICKET_HANDLER_ROLES.map(String));
}

export function canViewAllTickets(auth: AuthUser): boolean {
  return hasAnyRole(auth, TICKET_MANAGER_ROLES.map(String));
}

function toDate(v: unknown): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v === 'object' && v !== null && 'toDate' in v && typeof (v as { toDate: () => Date }).toDate === 'function') {
    return (v as { toDate: () => Date }).toDate();
  }
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
}

async function nextTicketNumber(schoolId: string, prefix = 'TKT'): Promise<string> {
  const year = new Date().getFullYear();
  const fullPrefix = `${prefix}-${year}-`;
  const snap = await ticketsCollection().where('schoolId', '==', schoolId).get();
  let seq = 0;
  for (const doc of snap.docs) {
    const num = String(doc.data().ticketNumber ?? '');
    if (!num.startsWith(fullPrefix)) continue;
    const n = parseInt(num.slice(fullPrefix.length), 10);
    if (!Number.isNaN(n) && n > seq) seq = n;
  }
  return `${fullPrefix}${String(seq + 1).padStart(4, '0')}`;
}

function isGuestCreator(creatorId: string): boolean {
  return creatorId.startsWith('guest_');
}

/** CRM ticket when a visitor starts public landing chat. */
export async function createPublicChatCrmTicket(input: {
  schoolId: string;
  sessionId: string;
  conversationId: string;
  visitorName: string;
  visitorContact: string;
  csStaffId: string;
  csStaffName: string;
}) {
  const now = new Date();
  const ticketNumber = await nextTicketNumber(input.schoolId, 'CRM');
  const guestUid = `guest_${input.sessionId}`;
  const ref = ticketsCollection().doc();

  const ticket = {
    schoolId: input.schoolId,
    ticketNumber,
    category: 'general' as TicketCategory,
    source: 'public_chat' as const,
    subject: `Chat Web: ${input.visitorName}`,
    description: `Kontak: ${input.visitorContact}\n\nPengunjung memulai live chat dari halaman landing sekolah.`,
    status: 'open' as TicketStatus,
    creatorId: guestUid,
    creatorName: `${input.visitorName} (Pengunjung Web)`,
    visitorContact: input.visitorContact,
    publicSessionId: input.sessionId,
    conversationId: input.conversationId,
    chatMessageCount: 0,
    assigneeRoles: [UserRole.STAFF].map(String),
    assignedToId: input.csStaffId,
    assignedToName: input.csStaffName,
    createdAt: now,
    updatedAt: now,
  };

  await ref.set(ticket);

  void sendChatPush(input.csStaffId, {
    title: `CRM baru: ${ticketNumber}`,
    body: `${input.visitorName} · ${input.visitorContact}`,
    href: '/tickets',
  });

  return { ticketId: ref.id, ticketNumber };
}

export async function syncPublicChatMessageToTicket(
  ticketId: string,
  messageText: string,
  messageCount: number
) {
  const ref = ticketsCollection().doc(ticketId);
  const snap = await ref.get();
  if (!snap.exists) return;

  const ticket = snap.data()!;
  if (ticket.source !== 'public_chat') return;
  if (ticket.status === 'resolved' || ticket.status === 'closed') return;

  const snippet = messageText.trim().slice(0, 500);
  const now = new Date();
  const baseDesc = String(ticket.description ?? '').split('\n\n--- Percakapan ---')[0];

  await ref.update({
    lastChatMessage: snippet,
    chatMessageCount: messageCount,
    description: `${baseDesc}\n\n--- Percakapan ---\n${snippet}`,
    updatedAt: now,
    ...(ticket.status === 'open' ? { status: 'in_progress' } : {}),
  });
}

async function findAssignee(schoolId: string, category: TicketCategory) {
  const roles = TICKET_CATEGORY_ASSIGNEE_ROLES[category].map(String);
  for (const role of roles) {
    const snap = await usersCollection()
      .where('schoolId', '==', schoolId)
      .where('role', '==', role)
      .limit(3)
      .get();
    const active = snap.docs.find((d) => d.data().isActive !== false);
    if (active) {
      const data = active.data();
      return { id: active.id, name: String(data.name ?? 'Staf') };
    }
  }
  return null;
}

export async function createTicket(
  auth: AuthUser,
  schoolId: string,
  input: { category: string; subject: string; description: string }
) {
  if (!canCreateTicket(auth)) throw new Error('Forbidden');
  const category = input.category as TicketCategory;
  if (!VALID_CATEGORIES.includes(category)) throw new Error('Kategori tidak valid');

  const subject = input.subject.trim().slice(0, 120);
  const description = input.description.trim().slice(0, 2000);
  if (subject.length < 3) throw new Error('Subjek minimal 3 karakter');
  if (description.length < 10) throw new Error('Deskripsi minimal 10 karakter');

  const userSnap = await usersCollection().doc(auth.uid).get();
  const userName = String(userSnap.data()?.name ?? 'Orang Tua');

  const assignee = await findAssignee(schoolId, category);
  const now = new Date();
  const ticketNumber = await nextTicketNumber(schoolId, 'TKT');

  const ref = ticketsCollection().doc();
  const ticket = {
    schoolId,
    ticketNumber,
    category,
    source: 'parent' as const,
    subject,
    description,
    status: 'open' as TicketStatus,
    creatorId: auth.uid,
    creatorName: userName,
    assigneeRoles: TICKET_CATEGORY_ASSIGNEE_ROLES[category].map(String),
    assignedToId: assignee?.id,
    assignedToName: assignee?.name,
    createdAt: now,
    updatedAt: now,
  };

  await ref.set(ticket);

  if (assignee?.id) {
    void sendChatPush(assignee.id, {
      title: `Tiket baru: ${ticketNumber}`,
      body: subject,
      href: '/tickets',
    });
  }

  return docToJson(await ref.get());
}

export async function listTickets(auth: AuthUser, schoolId: string) {
  if (canCreateTicket(auth)) {
    const snap = await ticketsCollection()
      .where('schoolId', '==', schoolId)
      .where('creatorId', '==', auth.uid)
      .get();
    return snap.docs
      .map((d) => docToJson(d))
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }

  if (!canHandleTickets(auth)) throw new Error('Forbidden');

  const snap = await ticketsCollection().where('schoolId', '==', schoolId).get();
  const rows = snap.docs.map((d) => docToJson(d));

  if (canViewAllTickets(auth)) {
    return rows.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }

  return rows
    .filter(
      (t) =>
        t.assignedToId === auth.uid ||
        (t.assigneeRoles as string[] | undefined)?.includes(auth.role)
    )
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

export async function getTicketStats(auth: AuthUser, schoolId: string): Promise<TicketStats> {
  if (!canViewAllTickets(auth)) throw new Error('Forbidden');

  const snap = await ticketsCollection().where('schoolId', '==', schoolId).get();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const stats: TicketStats = {
    total: 0,
    pending: 0,
    open: 0,
    acknowledged: 0,
    in_progress: 0,
    resolved: 0,
    closed: 0,
    parentTickets: 0,
    publicChatTickets: 0,
    resolvedThisMonth: 0,
    byCategory: {},
  };

  for (const doc of snap.docs) {
    const t = doc.data();
    stats.total += 1;

    const status = String(t.status ?? 'open') as TicketStatus;
    if (status === 'open') stats.open += 1;
    else if (status === 'acknowledged') stats.acknowledged += 1;
    else if (status === 'in_progress') stats.in_progress += 1;
    else if (status === 'resolved') stats.resolved += 1;
    else if (status === 'closed') stats.closed += 1;

    if (status !== 'resolved' && status !== 'closed') stats.pending += 1;

    const source = String(t.source ?? 'parent');
    if (source === 'public_chat') stats.publicChatTickets += 1;
    else stats.parentTickets += 1;

    const cat = String(t.category ?? 'general') as TicketCategory;
    stats.byCategory[cat] = (stats.byCategory[cat] ?? 0) + 1;

    if (status === 'resolved' || status === 'closed') {
      const resolvedAt = toDate(t.resolvedAt);
      if (resolvedAt && resolvedAt >= monthStart) stats.resolvedThisMonth += 1;
    }
  }

  return stats;
}

export async function updateTicket(
  auth: AuthUser,
  schoolId: string,
  ticketId: string,
  input: { status?: TicketStatus; resolutionNote?: string }
) {
  if (!canHandleTickets(auth)) throw new Error('Forbidden');

  const ref = ticketsCollection().doc(ticketId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error('Tiket tidak ditemukan');

  const ticket = snap.data()!;
  if (ticket.schoolId !== schoolId) throw new Error('Forbidden');

  const handlerSnap = await usersCollection().doc(auth.uid).get();
  const handlerName = String(handlerSnap.data()?.name ?? 'Staf');
  const now = new Date();
  const update: Record<string, unknown> = { updatedAt: now };

  const status = input.status;
  if (status) {
    update.status = status;
    if (status === 'acknowledged' && !ticket.acknowledgedAt) {
      update.acknowledgedAt = now;
      update.acknowledgedById = auth.uid;
      update.acknowledgedByName = handlerName;
      if (!ticket.assignedToId) {
        update.assignedToId = auth.uid;
        update.assignedToName = handlerName;
      }
    }
    if (status === 'in_progress') {
      update.status = 'in_progress';
      if (!ticket.assignedToId) {
        update.assignedToId = auth.uid;
        update.assignedToName = handlerName;
      }
    }
    if (status === 'resolved' || status === 'closed') {
      update.resolvedAt = now;
      update.resolvedById = auth.uid;
      update.resolvedByName = handlerName;
      update.resolutionNote = input.resolutionNote?.trim().slice(0, 1000) ?? ticket.resolutionNote;
      update.parentNotifiedAt = now;
    }
  }

  await ref.update(update);
  const updated = docToJson(await ref.get());

  if (status === 'resolved' || status === 'closed') {
    const creatorId = String(ticket.creatorId);
    if (!isGuestCreator(creatorId)) {
      void sendChatPush(creatorId, {
        title: `Tiket ${ticket.ticketNumber} selesai`,
        body: input.resolutionNote?.slice(0, 120) || String(ticket.subject),
        href: '/tickets',
      });
    }
  } else if (status === 'acknowledged') {
    const creatorId = String(ticket.creatorId);
    if (!isGuestCreator(creatorId)) {
      void sendChatPush(creatorId, {
        title: `Tiket ${ticket.ticketNumber} diterima`,
        body: `Ditangani oleh ${handlerName}`,
        href: '/tickets',
      });
    }
  }

  return updated;
}

export async function getSchoolTicketConfig(schoolId: string) {
  const snap = await schoolsCollection().doc(schoolId).get();
  if (!snap.exists) return null;
  const data = snap.data();
  return {
    customerServiceStaffId: data?.customerServiceStaffId as string | undefined,
    publicChatEnabled: (data?.landingPage as { publicChatEnabled?: boolean })?.publicChatEnabled,
  };
}
