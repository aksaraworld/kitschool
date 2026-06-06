import { NextRequest } from 'next/server';
import type { AuthUser } from '@/lib/server/auth-helpers';
import { hasAnyRole } from '@/lib/server/auth-helpers';
import { schoolsCollection } from '@/lib/server/firebase-admin';
import { UserRole } from '@/lib/types';
import type { SchoolUnit } from '@/lib/types';

const UNIT_SWITCHER_ROLES = [UserRole.KETUA_YAYASAN, UserRole.KETUA_PESANTREN];

export function canSwitchUnits(auth: AuthUser | null): boolean {
  return hasAnyRole(auth, UNIT_SWITCHER_ROLES);
}

export function getUnitId(req: NextRequest, auth: AuthUser | null): string | undefined {
  if (!canSwitchUnits(auth)) return undefined;
  const header = req.headers.get('x-unit-id');
  return header?.trim() || undefined;
}

export function resolveUnit(units: SchoolUnit[], unitId: string): SchoolUnit | undefined {
  return units.find((u) => u.id === unitId);
}

/** Match Firestore record to selected school unit (by unitId or jenjang label). */
export function recordMatchesUnit(
  data: Record<string, unknown>,
  unitId: string,
  unit?: SchoolUnit
): boolean {
  if (data.unitId === unitId) return true;
  const unitName = unit?.name ?? unitId;
  const jenjang = String(data.jenjang ?? data.unitLabel ?? '').trim();
  if (!jenjang) return false;
  if (jenjang === unitName) return true;
  if (jenjang.toLowerCase() === unitId.toLowerCase()) return true;
  if (jenjang.toLowerCase() === unitName.toLowerCase()) return true;
  return false;
}

export function classMatchesUnit(
  classData: Record<string, unknown>,
  unitId: string,
  units: SchoolUnit[]
): boolean {
  const unit = resolveUnit(units, unitId);
  if (recordMatchesUnit(classData, unitId, unit)) return true;
  const docId = String(classData.id ?? classData._id ?? '').toLowerCase();
  if (docId.startsWith(`${unitId.toLowerCase()}-`) || docId.startsWith(`${unitId.toLowerCase()}_`)) {
    return true;
  }
  const majorLevel = String(classData.level ?? '').trim();
  const jenjang = String(classData.jenjang ?? '').trim();
  if (unit && jenjang === unit.name) return true;
  if (unit?.name === 'MA' && majorLevel === 'X') return unitId === 'ma';
  if (unit?.name === 'MTs' && jenjang === 'MTs') return unitId === 'mts';
  return false;
}

export async function loadSchoolUnits(schoolId: string): Promise<SchoolUnit[]> {
  const snap = await schoolsCollection().doc(schoolId).get();
  if (!snap.exists) return [];
  const school = snap.data() as { units?: SchoolUnit[]; jenjang?: string[] };
  if (school.units?.length) return school.units;
  return (school.jenjang || []).map((j) => ({
    id: j.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    name: j,
    label: j,
  }));
}
