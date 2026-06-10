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

/** Staff, teachers, principal, leadership — not parents. */
function isInternalChatUser(user: UserDoc): boolean {
  if (isParent(user)) return false;
  return hasAnyRole(user, CHAT_ROLES.map(String));
}

async function getStudentIdsInTeacherClasses(teacherUid: string, schoolId: string): Promise<Set<string>> {
  const classesSnap = await classesCollection().where('schoolId', '==', schoolId).get();
  const studentIds = new Set<string>();
  for (const doc of classesSnap.docs) {
    const data = doc.data() as { homeroomTeacherId?: string; studentIds?: string[] };
    const isHomeroom = data.homeroomTeacherId === teacherUid;
    const teacherDoc = await usersCollection().doc(teacherUid).get();
    const assigned = (teacherDoc.data() as { assignedClasses?: string[] })?.assignedClasses ?? [];
    const inAssigned = assigned.includes(doc.id);
    if (isHomeroom || inAssigned) {
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
  const parentsSnap = await usersCollection().where('schoolId', '==', schoolId).where('role', '==', UserRole.PARENT).get();
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
  const snap = await usersCollection().where('schoolId', '==', schoolId).where('role', '==', UserRole.PARENT).get();
  return new Set(snap.docs.map((d) => d.id));
}

/** Parent UIDs the sender is allowed to message. */
export async function getAllowedParentIds(sender: UserDoc, schoolId: string): Promise<Set<string>> {
  const allowed = new Set<string>();

  // TU / finance / leadership (not assigned as room head only)
  if (isBroadcastStaff(sender) && !sender.boardingRoomHeadId) {
    const all = await getAllParentIds(schoolId);
    all.forEach((id) => allowed.add(id));
  }

  // Teacher → parents in their class(es)
  if (isTeacher(sender)) {
    const students = await getStudentIdsInTeacherClasses(sender.uid, schoolId);
    const parents = await getParentIdsForStudents(students, schoolId);
    parents.forEach((id) => allowed.add(id));
  }

  // Kepala kamar (staff) → parents in boarding room only
  if (sender.boardingRoomHeadId) {
    const students = await getStudentIdsInBoardingRoom(sender.boardingRoomHeadId);
    const parents = await getParentIdsForStudents(students, schoolId);
    parents.forEach((id) => allowed.add(id));
  }

  return allowed;
}

/** Staff/teacher UIDs a parent is allowed to message. */
export async function getAllowedStaffIdsForParent(parent: UserDoc, schoolId: string): Promise<Set<string>> {
  const allowed = new Set<string>();
  const children = parent.children ?? [];
  if (!children.length) return allowed;

  const usersSnap = await usersCollection().where('schoolId', '==', schoolId).get();
  const childSet = new Set(children);

  const classesSnap = await classesCollection().where('schoolId', '==', schoolId).get();
  const teacherIds = new Set<string>();
  for (const doc of classesSnap.docs) {
    const data = doc.data() as { homeroomTeacherId?: string; studentIds?: string[] };
    const hasChild = (data.studentIds ?? []).some((id) => childSet.has(id));
    if (hasChild && data.homeroomTeacherId) {
      teacherIds.add(data.homeroomTeacherId);
    }
  }

  for (const doc of usersSnap.docs) {
    const data = doc.data() as UserDoc;
    if (data.isActive === false) continue;
    const uid = doc.id;

    if (isBroadcastStaff({ ...data, uid })) {
      allowed.add(uid);
      continue;
    }

    if (isTeacher({ ...data, uid }) && teacherIds.has(uid)) {
      allowed.add(uid);
      continue;
    }

    const assigned = data.assignedClasses ?? [];
    for (const classDoc of classesSnap.docs) {
      const classData = classDoc.data() as { studentIds?: string[] };
      const hasChild = (classData.studentIds ?? []).some((id) => childSet.has(id));
      if (hasChild && assigned.includes(classDoc.id)) {
        allowed.add(uid);
      }
    }

    if (data.boardingRoomHeadId) {
      const roomStudents = await getStudentIdsInBoardingRoom(data.boardingRoomHeadId);
      if ([...childSet].some((c) => roomStudents.has(c))) {
        allowed.add(uid);
      }
    }
  }

  const roomsSnap = await boardingRoomsCollection().where('schoolId', '==', schoolId).get();
  for (const roomDoc of roomsSnap.docs) {
    const room = roomDoc.data() as { studentIds?: string[]; roomHeadStaffId?: string };
    const hasChild = (room.studentIds ?? []).some((id) => childSet.has(id));
    if (hasChild && room.roomHeadStaffId) {
      allowed.add(room.roomHeadStaffId);
    }
  }

  return allowed;
}

/** Check if sender can message recipient. */
export async function canMessageUser(
  sender: UserDoc,
  recipient: UserDoc,
  schoolId: string
): Promise<boolean> {
  if (sender.uid === recipient.uid) return false;
  if (sender.schoolId !== schoolId || recipient.schoolId !== schoolId) return false;
  if (recipient.isActive === false || sender.isActive === false) return false;

  if (isParent(sender) && isParent(recipient)) return false;

  if (isParent(sender)) {
    if (!isParent(recipient)) {
      const allowed = await getAllowedStaffIdsForParent(sender, schoolId);
      return allowed.has(recipient.uid);
    }
    return false;
  }

  if (isParent(recipient)) {
    const allowed = await getAllowedParentIds(sender, schoolId);
    return allowed.has(recipient.uid);
  }

  // Staff ↔ principal ↔ teacher ↔ TU ↔ leadership within same school
  if (isInternalChatUser(sender) && isInternalChatUser(recipient)) {
    return true;
  }

  return false;
}

export async function getChatRecipients(auth: AuthUser, schoolId: string): Promise<UserDoc[]> {
  const senderSnap = await usersCollection().doc(auth.uid).get();
  if (!senderSnap.exists) return [];
  const sender = { ...(senderSnap.data() as UserDoc), uid: auth.uid, schoolId };

  const usersSnap = await usersCollection().where('schoolId', '==', schoolId).get();
  const recipients: UserDoc[] = [];

  for (const doc of usersSnap.docs) {
    if (doc.id === auth.uid) continue;
    const recipient = { ...(doc.data() as UserDoc), uid: doc.id };
    if (recipient.isActive === false) continue;
    if (!(await canMessageUser(sender, recipient, schoolId))) continue;
    recipients.push(recipient);
  }

  recipients.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
  return recipients;
}

export function conversationIdFor(participantA: string, participantB: string): string {
  return [participantA, participantB].sort().join('_');
}
