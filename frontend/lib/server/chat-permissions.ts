/**
 * Chat permission rules:
 * - Internal (staff, principal, teachers, leadership, finance) → each other in same school
 * - Staff/TU/leadership → all parents in school
 * - Teacher/homeroom → parents of students in their class(es)
 * - Room head staff → parents of students in their boarding room
 * - Parent → inverse of above (teachers of child's class, staff, room head)
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

function isInternalChatUser(user: UserDoc): boolean {
  if (isParent(user)) return false;
  return hasAnyRole(user, CHAT_ROLES.map(String));
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

async function fetchInternalChatUsers(schoolId: string, excludeUid: string): Promise<UserDoc[]> {
  const users: UserDoc[] = [];

  for (let i = 0; i < INTERNAL_CHAT_ROLES.length; i += 10) {
    const roles = INTERNAL_CHAT_ROLES.slice(i, i + 10).map(String);
    const snap = await usersCollection()
      .where('schoolId', '==', schoolId)
      .where('role', 'in', roles)
      .get();

    for (const doc of snap.docs) {
      if (doc.id === excludeUid) continue;
      const data = doc.data() as UserDoc;
      if (data.isActive === false) continue;
      users.push({ ...data, uid: doc.id });
    }
  }

  return users;
}

async function getStudentIdsInTeacherClasses(teacherUid: string, schoolId: string): Promise<Set<string>> {
  const [classesSnap, teacherDoc] = await Promise.all([
    classesCollection().where('schoolId', '==', schoolId).get(),
    usersCollection().doc(teacherUid).get(),
  ]);

  const assigned = (teacherDoc.data() as { assignedClasses?: string[] })?.assignedClasses ?? [];
  const studentIds = new Set<string>();

  for (const doc of classesSnap.docs) {
    const data = doc.data() as { homeroomTeacherId?: string; studentIds?: string[] };
    if (data.homeroomTeacherId === teacherUid || assigned.includes(doc.id)) {
      (data.studentIds ?? []).forEach((id) => studentIds.add(id));
    }
  }

  return studentIds;
}

async function getStudentIdsInBoardingRoom(roomId: string): Promise<Set<string>> {
  const roomSnap = await boardingRoomsCollection().doc(roomId).get();
  if (!roomSnap.exists) return new Set();
  const data = roomSnap.data() as { studentIds?: string[] };
  return new Set(data.studentIds ?? []);
}

async function getParentIdsForStudents(studentIds: Set<string>, schoolId: string): Promise<Set<string>> {
  if (!studentIds.size) return new Set();

  const parentsSnap = await usersCollection()
    .where('schoolId', '==', schoolId)
    .where('role', '==', UserRole.PARENT)
    .get();

  const parentIds = new Set<string>();
  for (const doc of parentsSnap.docs) {
    const children = (doc.data() as { children?: string[] }).children ?? [];
    if (children.some((c) => studentIds.has(c))) {
      parentIds.add(doc.id);
    }
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

  const [usersSnap, classesSnap, roomsSnap] = await Promise.all([
    usersCollection().where('schoolId', '==', schoolId).get(),
    classesCollection().where('schoolId', '==', schoolId).get(),
    boardingRoomsCollection().where('schoolId', '==', schoolId).get(),
  ]);

  const homeroomTeacherIds = new Set<string>();
  const assignedTeacherIds = new Set<string>();

  for (const doc of classesSnap.docs) {
    const data = doc.data() as { homeroomTeacherId?: string; studentIds?: string[] };
    const hasChild = (data.studentIds ?? []).some((id) => childSet.has(id));
    if (!hasChild) continue;
    if (data.homeroomTeacherId) homeroomTeacherIds.add(data.homeroomTeacherId);
  }

  for (const doc of usersSnap.docs) {
    const data = doc.data() as UserDoc;
    if (data.isActive === false) continue;
    const uid = doc.id;
    const user = { ...data, uid };

    if (isBroadcastStaff(user)) {
      allowed.add(uid);
      continue;
    }

    if (isTeacher(user)) {
      if (homeroomTeacherIds.has(uid)) {
        allowed.add(uid);
        continue;
      }
      const assigned = data.assignedClasses ?? [];
      for (const classDoc of classesSnap.docs) {
        const classData = classDoc.data() as { studentIds?: string[] };
        const hasChild = (classData.studentIds ?? []).some((id) => childSet.has(id));
        if (hasChild && assigned.includes(classDoc.id)) {
          allowed.add(uid);
          break;
        }
      }
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

/** Single source of truth — recipient list + POST /conversations both use this. */
export async function getAllowedRecipientIds(
  sender: UserDoc,
  schoolId: string
): Promise<Set<string>> {
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

export async function getChatRecipients(
  auth: AuthUser,
  schoolId: string,
  filter: ChatRecipientFilter = {}
): Promise<UserDoc[]> {
  const senderSnap = await usersCollection().doc(auth.uid).get();
  if (!senderSnap.exists) return [];
  const sender = { ...(senderSnap.data() as UserDoc), uid: auth.uid, schoolId };

  const allowedIds = await getAllowedRecipientIds(sender, schoolId);
  let recipients = await fetchUsersByIds(allowedIds);

  const q = filter.q?.trim().toLowerCase();
  if (filter.role && filter.role !== 'all') {
    recipients = recipients.filter((r) => r.role === filter.role);
  }
  if (q) {
    recipients = recipients.filter((r) => {
      const haystack = [r.name, r.email, r.role].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }

  recipients.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));

  const limit = Math.min(filter.limit ?? 100, 200);
  return recipients.slice(0, limit);
}

export function conversationIdFor(participantA: string, participantB: string): string {
  return [participantA, participantB].sort().join('_');
}
