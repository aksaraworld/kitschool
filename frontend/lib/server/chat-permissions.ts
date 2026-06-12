/**
 * Chat permission rules (optimized queries + short TTL cache).
 */

import type { AuthUser } from '@/lib/server/auth-helpers';
import {
  usersCollection,
  classesCollection,
  boardingRoomsCollection,
  getFirestore,
} from '@/lib/server/firebase-admin';
import {
  UserRole,
  CHAT_ROLES,
  CHAT_BROADCAST_STAFF_ROLES,
  getEffectiveRoles,
  hasAnyRole,
} from '@/lib/types';
import {
  cacheKey,
  getCachedAllowedIds,
  getCachedRecipientManifest,
  setCachedAllowedIds,
  setCachedRecipientManifest,
} from '@/lib/server/chat-permissions-cache';

type UserDoc = {
  uid: string;
  name?: string;
  email?: string;
  avatar?: string;
  role?: string;
  roles?: string[];
  schoolId?: string;
  children?: string[];
  homeroomClassId?: string;
  assignedClasses?: string[];
  boardingRoomHeadId?: string;
  isActive?: boolean;
};

const TEACHER_ROLES = [
  UserRole.TEACHER,
  UserRole.HOMEROOM_TEACHER,
  UserRole.GURU_PRODUKTIF,
];

const INTERNAL_CHAT_ROLES = CHAT_ROLES.filter((r) => r !== UserRole.PARENT);

export function canUseChat(auth: AuthUser | null): boolean {
  return hasAnyRole(auth, CHAT_ROLES.map(String));
}

function isBroadcastStaff(user: UserDoc): boolean {
  return hasAnyRole(user, CHAT_BROADCAST_STAFF_ROLES.map(String));
}

function isTeacher(user: UserDoc): boolean {
  return hasAnyRole(user, TEACHER_ROLES.map(String));
}

function isParent(user: UserDoc): boolean {
  return user.role === UserRole.PARENT || getEffectiveRoles(user).includes(UserRole.PARENT);
}

async function fetchUsersByIds(ids: Iterable<string>): Promise<UserDoc[]> {
  const idList = [...ids];
  if (!idList.length) return [];

  const db = getFirestore();
  const users: UserDoc[] = [];

  for (let i = 0; i < idList.length; i += 30) {
    const chunk = idList.slice(i, i + 30).map((id) => usersCollection().doc(id));
    const snaps = await db.getAll(...chunk);
    for (const snap of snaps) {
      if (!snap.exists) continue;
      const data = snap.data() as UserDoc;
      if (data.isActive === false) continue;
      users.push({ ...data, uid: snap.id });
    }
  }

  return users;
}

async function fetchUsersByRoles(schoolId: string, roles: string[]): Promise<UserDoc[]> {
  const users: UserDoc[] = [];
  for (let i = 0; i < roles.length; i += 10) {
    const chunk = roles.slice(i, i + 10);
    const snap = await usersCollection()
      .where('schoolId', '==', schoolId)
      .where('role', 'in', chunk)
      .get();
    for (const doc of snap.docs) {
      const data = doc.data() as UserDoc;
      if (data.isActive === false) continue;
      users.push({ ...data, uid: doc.id });
    }
  }
  return users;
}

async function fetchInternalChatUsers(schoolId: string, excludeUid: string): Promise<UserDoc[]> {
  const users = await fetchUsersByRoles(
    schoolId,
    INTERNAL_CHAT_ROLES.map(String)
  );
  return users.filter((u) => u.uid !== excludeUid);
}

async function getStudentIdsInTeacherClasses(teacherUid: string, schoolId: string): Promise<Set<string>> {
  const [homeroomSnap, teacherDoc] = await Promise.all([
    classesCollection()
      .where('schoolId', '==', schoolId)
      .where('homeroomTeacherId', '==', teacherUid)
      .get(),
    usersCollection().doc(teacherUid).get(),
  ]);

  const studentIds = new Set<string>();
  for (const doc of homeroomSnap.docs) {
    ((doc.data() as { studentIds?: string[] }).studentIds ?? []).forEach((id) => studentIds.add(id));
  }

  const assigned = (teacherDoc.data() as { assignedClasses?: string[] })?.assignedClasses ?? [];
  if (assigned.length) {
    const db = getFirestore();
    for (let i = 0; i < assigned.length; i += 30) {
      const chunk = assigned.slice(i, i + 30).map((id) => classesCollection().doc(id));
      const snaps = await db.getAll(...chunk);
      for (const snap of snaps) {
        if (!snap.exists) continue;
        const data = snap.data() as { schoolId?: string; studentIds?: string[] };
        if (data.schoolId && data.schoolId !== schoolId) continue;
        (data.studentIds ?? []).forEach((id) => studentIds.add(id));
      }
    }
  }

  return studentIds;
}

async function getStudentIdsInBoardingRoom(roomId: string): Promise<Set<string>> {
  const roomSnap = await boardingRoomsCollection().doc(roomId).get();
  if (!roomSnap.exists) return new Set();
  return new Set((roomSnap.data() as { studentIds?: string[] }).studentIds ?? []);
}

async function getParentIdsForStudents(studentIds: Set<string>, schoolId: string): Promise<Set<string>> {
  if (!studentIds.size) return new Set();

  const parentIds = new Set<string>();
  const idList = [...studentIds];

  for (let i = 0; i < idList.length; i += 10) {
    const chunk = idList.slice(i, i + 10);
    const snap = await usersCollection()
      .where('schoolId', '==', schoolId)
      .where('role', '==', UserRole.PARENT)
      .where('children', 'array-contains-any', chunk)
      .get();
    snap.docs.forEach((d) => parentIds.add(d.id));
  }

  return parentIds;
}

async function getAllParentIds(schoolId: string): Promise<Set<string>> {
  const snap = await usersCollection()
    .where('schoolId', '==', schoolId)
    .where('role', '==', UserRole.PARENT)
    .get();
  return new Set(snap.docs.map((d) => d.id));
}

export async function getAllowedParentIds(sender: UserDoc, schoolId: string): Promise<Set<string>> {
  const allowed = new Set<string>();

  if (isBroadcastStaff(sender) && !sender.boardingRoomHeadId) {
    const all = await getAllParentIds(schoolId);
    all.forEach((id) => allowed.add(id));
  }

  if (isTeacher(sender)) {
    const students = await getStudentIdsInTeacherClasses(sender.uid, schoolId);
    const parents = await getParentIdsForStudents(students, schoolId);
    parents.forEach((id) => allowed.add(id));
  }

  if (sender.boardingRoomHeadId) {
    const students = await getStudentIdsInBoardingRoom(sender.boardingRoomHeadId);
    const parents = await getParentIdsForStudents(students, schoolId);
    parents.forEach((id) => allowed.add(id));
  }

  return allowed;
}

export async function getAllowedStaffIdsForParent(parent: UserDoc, schoolId: string): Promise<Set<string>> {
  const allowed = new Set<string>();
  const children = parent.children ?? [];
  if (!children.length) return allowed;

  const childSet = new Set(children);

  const [classesSnap, roomsSnap, broadcastStaff, teachers] = await Promise.all([
    classesCollection().where('schoolId', '==', schoolId).get(),
    boardingRoomsCollection().where('schoolId', '==', schoolId).get(),
    fetchUsersByRoles(schoolId, CHAT_BROADCAST_STAFF_ROLES.map(String)),
    fetchUsersByRoles(schoolId, TEACHER_ROLES.map(String)),
  ]);

  broadcastStaff.forEach((u) => allowed.add(u.uid));

  const relevantClassIds = new Set<string>();
  const homeroomTeacherIds = new Set<string>();

  for (const doc of classesSnap.docs) {
    const data = doc.data() as { homeroomTeacherId?: string; studentIds?: string[] };
    const hasChild = (data.studentIds ?? []).some((id) => childSet.has(id));
    if (!hasChild) continue;
    relevantClassIds.add(doc.id);
    if (data.homeroomTeacherId) homeroomTeacherIds.add(data.homeroomTeacherId);
  }

  homeroomTeacherIds.forEach((id) => allowed.add(id));

  for (const teacher of teachers) {
    if (allowed.has(teacher.uid)) continue;
    const assigned = teacher.assignedClasses ?? [];
    if (assigned.some((cid) => relevantClassIds.has(cid))) {
      allowed.add(teacher.uid);
    }
  }

  for (const roomDoc of roomsSnap.docs) {
    const room = roomDoc.data() as { studentIds?: string[]; roomHeadStaffId?: string };
    const hasChild = (room.studentIds ?? []).some((id) => childSet.has(id));
    if (hasChild && room.roomHeadStaffId) {
      allowed.add(room.roomHeadStaffId);
    }
  }

  return allowed;
}

async function computeAllowedRecipientIds(sender: UserDoc, schoolId: string): Promise<Set<string>> {
  if (isParent(sender)) {
    return getAllowedStaffIdsForParent(sender, schoolId);
  }

  const [allowedParentIds, internalUsers] = await Promise.all([
    getAllowedParentIds(sender, schoolId),
    fetchInternalChatUsers(schoolId, sender.uid),
  ]);

  const allowed = new Set<string>(allowedParentIds);
  for (const u of internalUsers) {
    allowed.add(u.uid);
  }
  return allowed;
}

/** Single source of truth — recipient list + POST /conversations both use this. */
export async function getAllowedRecipientIds(
  sender: UserDoc,
  schoolId: string
): Promise<Set<string>> {
  const key = cacheKey(schoolId, sender.uid);
  const cached = getCachedAllowedIds(key);
  if (cached) return cached;

  const allowed = await computeAllowedRecipientIds(sender, schoolId);
  setCachedAllowedIds(key, allowed);
  return allowed;
}

export async function canMessageUser(
  sender: UserDoc,
  recipient: UserDoc,
  schoolId: string
): Promise<boolean> {
  if (sender.uid === recipient.uid) return false;
  if (sender.schoolId !== schoolId || recipient.schoolId !== schoolId) return false;
  if (recipient.isActive === false || sender.isActive === false) return false;
  if (isParent(sender) && isParent(recipient)) return false;

  const allowed = await getAllowedRecipientIds(sender, schoolId);
  return allowed.has(recipient.uid);
}

export type ChatRecipientFilter = {
  q?: string;
  role?: string;
  limit?: number;
};

async function getRecipientManifest(
  sender: UserDoc,
  schoolId: string
): Promise<{ uid: string; name?: string; email?: string; role?: string }[]> {
  const key = cacheKey(schoolId, sender.uid);
  const cached = getCachedRecipientManifest(key);
  if (cached) return cached;

  const allowedIds = await getAllowedRecipientIds(sender, schoolId);
  const users = await fetchUsersByIds(allowedIds);
  const manifest = users.map((u) => ({
    uid: u.uid,
    name: u.name,
    email: u.email,
    role: u.role,
  }));
  setCachedRecipientManifest(key, manifest);
  return manifest;
}

export async function getChatRecipients(
  auth: AuthUser,
  schoolId: string,
  filter: ChatRecipientFilter = {}
): Promise<UserDoc[]> {
  const senderSnap = await usersCollection().doc(auth.uid).get();
  if (!senderSnap.exists) return [];
  const sender = { ...(senderSnap.data() as UserDoc), uid: auth.uid, schoolId };

  let manifest = await getRecipientManifest(sender, schoolId);

  const q = filter.q?.trim().toLowerCase();
  if (filter.role && filter.role !== 'all') {
    manifest = manifest.filter((r) => r.role === filter.role);
  }
  if (q) {
    manifest = manifest.filter((r) => {
      const haystack = [r.name, r.email, r.role].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }

  manifest.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));

  const limit = Math.min(filter.limit ?? 100, 200);
  const slice = manifest.slice(0, limit);

  return slice.map((r) => ({
    uid: r.uid,
    name: r.name,
    email: r.email,
    role: r.role,
  })) as UserDoc[];
}

export function conversationIdFor(participantA: string, participantB: string): string {
  return [participantA, participantB].sort().join('_');
}
