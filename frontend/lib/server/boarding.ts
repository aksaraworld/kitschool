/**
 * Boarding school — room sync, enriched data, dashboard stats.
 */

import type { AuthUser } from '@/lib/server/auth-helpers';
import { hasAnyRole, hasFullAccess } from '@/lib/server/auth-helpers';
import {
  boardingAreasCollection,
  boardingRoomsCollection,
  boardingSchedulesCollection,
  boardingAttendanceCollection,
  boardingLeaveCollection,
  boardingPhoneLogsCollection,
  invoicesCollection,
  usersCollection,
  docToJson,
} from '@/lib/server/firebase-admin';
import {
  UserRole,
  BOARDING_MANAGE_ROLES,
  type BoardingActivitySchedule,
  type BoardingDashboardStats,
  type BoardingRoom,
  type BoardingRoomEnriched,
} from '@/lib/types';

export function canManageBoarding(auth: AuthUser | null): boolean {
  return hasFullAccess(auth) || hasAnyRole(auth, BOARDING_MANAGE_ROLES.map(String));
}

/** Mon–Sat treated as school days for phone policy. */
export function isBoardingSchoolDay(date = new Date()): boolean {
  const day = date.getDay();
  return day >= 1 && day <= 6;
}

/** Sync studentIds ↔ user.boardingRoomId, captain, room head. */
export async function syncRoomAssignments(
  roomId: string,
  schoolId: string,
  opts: {
    studentIds: string[];
    roomCaptainId?: string | null;
    roomHeadStaffId?: string | null;
    previousStudentIds?: string[];
    previousCaptainId?: string | null;
    previousHeadStaffId?: string | null;
  }
): Promise<void> {
  const prevStudents = new Set(opts.previousStudentIds ?? []);
  const nextStudents = new Set(opts.studentIds);

  for (const sid of prevStudents) {
    if (!nextStudents.has(sid)) {
      await usersCollection().doc(sid).set(
        {
          boardingRoomId: null,
          isRoomCaptain: false,
          canHoldPhone: false,
          updatedAt: new Date(),
        },
        { merge: true }
      );
    }
  }

  for (const sid of nextStudents) {
    const isCaptain = sid === opts.roomCaptainId;
    await usersCollection().doc(sid).set(
      {
        boardingRoomId: roomId,
        isRoomCaptain: isCaptain,
        canHoldPhone: isCaptain,
        updatedAt: new Date(),
      },
      { merge: true }
    );
  }

  if (opts.previousCaptainId && opts.previousCaptainId !== opts.roomCaptainId) {
    if (!nextStudents.has(opts.previousCaptainId)) {
      await usersCollection().doc(opts.previousCaptainId).set(
        { isRoomCaptain: false, canHoldPhone: false, updatedAt: new Date() },
        { merge: true }
      );
    }
  }

  if (opts.previousHeadStaffId && opts.previousHeadStaffId !== opts.roomHeadStaffId) {
    await usersCollection().doc(opts.previousHeadStaffId).set(
      { boardingRoomHeadId: null, updatedAt: new Date() },
      { merge: true }
    );
  }

  if (opts.roomHeadStaffId) {
    await usersCollection().doc(opts.roomHeadStaffId).set(
      { boardingRoomHeadId: roomId, updatedAt: new Date() },
      { merge: true }
    );
  }
}

export async function loadUserNameMap(schoolId: string, ids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const unique = [...new Set(ids.filter(Boolean))];
  for (const id of unique) {
    const snap = await usersCollection().doc(id).get();
    if (snap.exists) {
      map.set(id, String((snap.data() as { name?: string }).name ?? id));
    }
  }
  return map;
}

export async function enrichRooms(
  schoolId: string,
  rooms: BoardingRoom[]
): Promise<BoardingRoomEnriched[]> {
  const areasSnap = await boardingAreasCollection().where('schoolId', '==', schoolId).get();
  const areaMap = new Map(areasSnap.docs.map((d) => [d.id, String((d.data() as { name?: string }).name ?? '')]));

  const allIds: string[] = [];
  for (const r of rooms) {
    if (r.roomCaptainId) allIds.push(r.roomCaptainId);
    if (r.roomHeadStaffId) allIds.push(r.roomHeadStaffId);
    allIds.push(...(r.studentIds ?? []));
  }
  const names = await loadUserNameMap(schoolId, allIds);

  return rooms.map((r) => ({
    ...r,
    areaName: areaMap.get(r.areaId),
    captainName: r.roomCaptainId ? names.get(r.roomCaptainId) : undefined,
    headStaffName: r.roomHeadStaffId ? names.get(r.roomHeadStaffId) : undefined,
    studentNames: (r.studentIds ?? []).map((id) => ({ id, name: names.get(id) ?? id })),
  }));
}

export async function getBoardingDashboard(schoolId: string): Promise<BoardingDashboardStats> {
  const [roomsSnap, schedSnap, leaveSnap] = await Promise.all([
    boardingRoomsCollection().where('schoolId', '==', schoolId).where('isActive', '==', true).get(),
    boardingSchedulesCollection().where('schoolId', '==', schoolId).where('isActive', '==', true).get(),
    boardingLeaveCollection().where('schoolId', '==', schoolId).where('status', '==', 'pending').get(),
  ]);

  const rooms = roomsSnap.docs.map((d) => docToJson(d) as unknown as BoardingRoom);
  let totalCapacity = 0;
  let occupied = 0;
  let maleRooms = 0;
  let femaleRooms = 0;

  for (const r of rooms) {
    totalCapacity += r.capacity ?? 0;
    occupied += r.studentIds?.length ?? 0;
    if (r.gender === 'male') maleRooms++;
    else femaleRooms++;
  }

  const today = new Date().getDay();
  const tonightActivities = schedSnap.docs
    .map((d) => docToJson(d) as unknown as BoardingActivitySchedule)
    .filter((s) => s.dayOfWeek === today);

  const todayStr = new Date().toISOString().slice(0, 10);
  const phoneSnap = await boardingPhoneLogsCollection()
    .where('schoolId', '==', schoolId)
    .where('date', '==', todayStr)
    .get();
  const phoneCollectedToday = phoneSnap.docs.filter((d) => d.data().action === 'collected').length;

  return {
    totalRooms: rooms.length,
    totalCapacity,
    occupied,
    emptyBeds: totalCapacity - occupied,
    maleRooms,
    femaleRooms,
    tonightActivities,
    pendingLeaves: leaveSnap.size,
    phoneCollectedToday,
  };
}

/** Parent IDs for students in a room (for room chat). */
export async function getRoomParentRecipients(
  schoolId: string,
  roomId: string
): Promise<{ parentId: string; parentName: string; studentName: string }[]> {
  const roomSnap = await boardingRoomsCollection().doc(roomId).get();
  if (!roomSnap.exists) return [];
  const studentIds = (roomSnap.data() as { studentIds?: string[] }).studentIds ?? [];

  const parentsSnap = await usersCollection()
    .where('schoolId', '==', schoolId)
    .where('role', '==', UserRole.PARENT)
    .get();

  const out: { parentId: string; parentName: string; studentName: string }[] = [];
  const studentNames = await loadUserNameMap(schoolId, studentIds);

  for (const pDoc of parentsSnap.docs) {
    const children = (pDoc.data() as { children?: string[] }).children ?? [];
    const matched = studentIds.filter((sid) => children.includes(sid));
    if (!matched.length) continue;
    out.push({
      parentId: pDoc.id,
      parentName: String((pDoc.data() as { name?: string }).name ?? 'Orang Tua'),
      studentName: matched.map((id) => studentNames.get(id) ?? id).join(', '),
    });
  }
  return out;
}

/** Boarding students with pending pesantren-related invoices. */
export async function getBoardingFinanceSummary(schoolId: string) {
  const roomsSnap = await boardingRoomsCollection().where('schoolId', '==', schoolId).get();
  const studentIds = new Set<string>();
  for (const d of roomsSnap.docs) {
    ((d.data() as { studentIds?: string[] }).studentIds ?? []).forEach((id) => studentIds.add(id));
  }

  const invSnap = await invoicesCollection().where('schoolId', '==', schoolId).get();
  const pendingByStudent = new Map<string, number>();

  for (const doc of invSnap.docs) {
    const inv = doc.data();
    if (!['pending', 'partial', 'overdue'].includes(String(inv.status))) continue;
    const sid = String(inv.studentId ?? '');
    if (!studentIds.has(sid)) continue;
    pendingByStudent.set(sid, (pendingByStudent.get(sid) ?? 0) + Number(inv.remainingAmount ?? 0));
  }

  const names = await loadUserNameMap(schoolId, [...studentIds]);
  return [...pendingByStudent.entries()].map(([studentId, amount]) => ({
    studentId,
    studentName: names.get(studentId) ?? studentId,
    pendingAmount: amount,
  }));
}

/** Expand recurring boarding schedules into calendar events for a month. */
export function expandBoardingSchedulesForMonth(
  schedules: BoardingActivitySchedule[],
  year: number,
  month: number
): { date: string; title: string; activityType: string; startTime: string; endTime: string; scheduleId: string }[] {
  const events: { date: string; title: string; activityType: string; startTime: string; endTime: string; scheduleId: string }[] = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (const s of schedules) {
    if (s.isActive === false) continue;
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      if (d.getDay() !== s.dayOfWeek) continue;
      events.push({
        date: d.toISOString().slice(0, 10),
        title: s.title,
        activityType: s.activityType,
        startTime: s.startTime,
        endTime: s.endTime,
        scheduleId: s._id,
      });
    }
  }
  return events;
}
