import type { AuthUser } from '@/lib/server/auth-helpers';
import { hasAnyRole, hasFullAccess } from '@/lib/server/auth-helpers';
import {
  boardingRoomsCollection,
  disciplineIncidentsCollection,
  disciplineWarningsCollection,
  usersCollection,
  docToJson,
} from '@/lib/server/firebase-admin';
import {
  BK_COUNSELING_ROLES,
  BK_DORM_LOG_ROLES,
  BK_MANAGE_ROLES,
  BK_SCHOOL_LOG_ROLES,
  BK_VIEW_ROLES,
  BK_VIOLATION_MAP,
  BK_WARNING_LEVEL_LABELS,
  BK_WARNING_THRESHOLDS,
  type BkDisciplineStatus,
  type BkEnvironment,
  type BkRecordType,
  type BkViolationType,
  type BkWarningLevel,
  type DisciplineIncident,
  type DisciplineWarning,
} from '@/lib/types';

export function canViewBk(auth: AuthUser | null): boolean {
  return hasFullAccess(auth) || hasAnyRole(auth, BK_VIEW_ROLES.map(String));
}

export function canManageBk(auth: AuthUser | null): boolean {
  return hasFullAccess(auth) || hasAnyRole(auth, BK_MANAGE_ROLES.map(String));
}

export function canLogSchoolBk(auth: AuthUser | null): boolean {
  return canManageBk(auth) || hasAnyRole(auth, BK_SCHOOL_LOG_ROLES.map(String));
}

export async function isMusyrif(auth: AuthUser | null): Promise<boolean> {
  if (!auth?.uid) return false;
  const userSnap = await usersCollection().doc(auth.uid).get();
  const data = userSnap.data() as { boardingRoomHeadId?: string } | undefined;
  if (data?.boardingRoomHeadId) return true;
  const rooms = await boardingRoomsCollection()
    .where('roomHeadStaffId', '==', auth.uid)
    .limit(1)
    .get();
  return !rooms.empty;
}

export async function canLogDormBk(auth: AuthUser | null): Promise<boolean> {
  if (!auth) return false;
  if (canManageBk(auth) || hasAnyRole(auth, BK_DORM_LOG_ROLES.map(String))) return true;
  return isMusyrif(auth);
}

export async function canWriteCounseling(auth: AuthUser | null): Promise<boolean> {
  if (!auth) return false;
  if (canManageBk(auth) || hasAnyRole(auth, BK_COUNSELING_ROLES.map(String))) return true;
  return isMusyrif(auth);
}

export function canLogIncident(
  auth: AuthUser | null,
  environment: BkEnvironment,
  isMusyrifUser: boolean
): boolean {
  if (!auth) return false;
  if (environment === 'school') return canLogSchoolBk(auth);
  return canManageBk(auth) || hasAnyRole(auth, BK_DORM_LOG_ROLES.map(String)) || isMusyrifUser;
}

export function computePointTotals(incidents: DisciplineIncident[]) {
  let totalDemerit = 0;
  let totalMerit = 0;
  for (const row of incidents) {
    if (row.status !== 'active') continue;
    const pts = Math.abs(Number(row.points) || 0);
    if (row.recordType === 'merit') totalMerit += pts;
    else totalDemerit += pts;
  }
  return { totalDemerit, totalMerit, netPoints: Math.max(0, totalDemerit - totalMerit) };
}

export function resolveWarningLevel(netPoints: number): BkWarningLevel | null {
  let level: BkWarningLevel | null = null;
  for (const t of BK_WARNING_THRESHOLDS) {
    if (netPoints >= t.minPoints) level = t.level;
  }
  return level;
}

export async function getStudentIncidents(schoolId: string, studentId: string): Promise<DisciplineIncident[]> {
  const snap = await disciplineIncidentsCollection()
    .where('schoolId', '==', schoolId)
    .where('studentId', '==', studentId)
    .get();
  return snap.docs
    .map((d) => docToJson(d) as unknown as DisciplineIncident)
    .filter((r) => r.status === 'active')
    .sort((a, b) => String(b.occurredAt ?? '').localeCompare(String(a.occurredAt ?? '')));
}

export async function getStudentWarnings(schoolId: string, studentId: string): Promise<DisciplineWarning[]> {
  const snap = await disciplineWarningsCollection()
    .where('schoolId', '==', schoolId)
    .where('studentId', '==', studentId)
    .get();
  return snap.docs
    .map((d) => docToJson(d) as unknown as DisciplineWarning)
    .sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')));
}

export async function findParentId(studentId: string): Promise<string | null> {
  const studentSnap = await usersCollection().doc(studentId).get();
  const student = studentSnap.data() as { parentId?: string } | undefined;
  if (student?.parentId) return student.parentId;
  const parents = await usersCollection().where('children', 'array-contains', studentId).limit(1).get();
  return parents.empty ? null : parents.docs[0].id;
}

export function buildWarningMessage(
  level: BkWarningLevel,
  studentName: string,
  netPoints: number,
  violationLabel?: string
): { title: string; body: string } {
  const detail = violationLabel ? ` (${violationLabel})` : '';
  if (level === 1) {
    return {
      title: 'Pemberitahuan Perilaku',
      body: `Anak Anda ${studentName} mencatat pelanggaran${detail}. Total poin sanksi: ${netPoints}. Mohon bimbingan di rumah.`,
    };
  }
  if (level === 2) {
    return {
      title: 'Surat Peringatan 1 (SP 1)',
      body: `Anak Anda ${studentName} telah mencapai ${netPoints} poin sanksi. Surat Peringatan 1 diterbitkan — mohon konfirmasi digital di portal orang tua.`,
    };
  }
  return {
    title: 'SP 2/3 — Pertemuan Wajib',
    body: `Anak Anda ${studentName} mencapai ${netPoints} poin sanksi (${BK_WARNING_LEVEL_LABELS[3]}). Wajib hadir ke sekolah/pesantren untuk pertemuan dengan pihak BK.`,
  };
}

export function validateViolation(
  violationType: BkViolationType,
  environment: BkEnvironment,
  recordType: BkRecordType
): string | null {
  const def = BK_VIOLATION_MAP[violationType];
  if (!def) return 'Jenis pelanggaran tidak valid';
  if (def.recordType !== recordType) return 'Tipe poin tidak sesuai';
  if (def.environment !== 'both' && def.environment !== environment) {
    return `Pelanggaran ini hanya untuk lingkungan ${def.environment === 'school' ? 'sekolah' : 'asrama'}`;
  }
  return null;
}

export async function getDisciplineStatus(studentId: string): Promise<BkDisciplineStatus> {
  const snap = await usersCollection().doc(studentId).get();
  const status = (snap.data() as { disciplineStatus?: BkDisciplineStatus })?.disciplineStatus;
  return status ?? 'normal';
}
