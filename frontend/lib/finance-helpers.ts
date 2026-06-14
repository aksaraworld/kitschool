import { FeeStructure, FinanceUnit } from '@/lib/types';

/** Resolve finance unit from fee — supports legacy catalog without financeUnit field. */
export function resolveFeeFinanceUnit(fee: Pick<FeeStructure, 'financeUnit' | 'name'>): FinanceUnit | null {
  if (fee.financeUnit) return fee.financeUnit;
  const name = String(fee.name ?? '').toUpperCase();
  if (/\bMA\b/.test(name) || name.includes(' M.A') || name.endsWith(' MA')) return FinanceUnit.MA;
  if (/\bMTS\b/.test(name) || name.includes('MTs')) return FinanceUnit.MTS;
  if (name.includes('PESANTREN') || name.includes('PONDOK')) return FinanceUnit.PESANTREN;
  if (name.includes('YAYASAN') || name.includes('TAHUNAN')) return FinanceUnit.YAYASAN;
  return null;
}

export function studentJenjangUnit(student: { jenjang?: string; unitId?: string; unitLabel?: string }): FinanceUnit {
  const jenjang = String(student.jenjang ?? student.unitLabel ?? '').toUpperCase();
  if (jenjang.includes('MA')) return FinanceUnit.MA;
  if (jenjang.includes('MT')) return FinanceUnit.MTS;
  const unitId = String(student.unitId ?? '').toLowerCase();
  if (unitId === 'ma') return FinanceUnit.MA;
  if (unitId === 'mts') return FinanceUnit.MTS;
  return FinanceUnit.PESANTREN;
}

/** Catalog items visible for this student — MA only sees MA + shared, MTs only MTs + shared. */
export function feeAppliesToStudentJenjang(
  fee: Pick<FeeStructure, 'financeUnit' | 'name' | 'isActive'>,
  studentUnit: FinanceUnit
): boolean {
  if (fee.isActive === false) return false;
  const unit = resolveFeeFinanceUnit(fee);
  if (!unit) return false;
  if (unit === FinanceUnit.YAYASAN || unit === FinanceUnit.PESANTREN) return true;
  return unit === studentUnit;
}

export function filterCatalogForStudent<T extends Pick<FeeStructure, 'financeUnit' | 'name' | 'isActive'>>(
  catalog: T[],
  student: { jenjang?: string; unitId?: string; unitLabel?: string } | null
): { shared: T[]; jenjang: T[]; studentUnit: FinanceUnit | null } {
  if (!student) return { shared: [], jenjang: [], studentUnit: null };
  const studentUnit = studentJenjangUnit(student);
  const applicable = catalog.filter((f) => feeAppliesToStudentJenjang(f, studentUnit));
  const shared = applicable.filter((f) => {
    const u = resolveFeeFinanceUnit(f);
    return u === FinanceUnit.YAYASAN || u === FinanceUnit.PESANTREN;
  });
  const jenjang = applicable.filter((f) => {
    const u = resolveFeeFinanceUnit(f);
    return u === FinanceUnit.MTS || u === FinanceUnit.MA;
  });
  return { shared, jenjang, studentUnit };
}

export const JENJANG_FILTER_OPTIONS = [
  { value: '', label: 'Semua Jenjang' },
  { value: 'MTs', label: 'MTs' },
  { value: 'MA', label: 'MA' },
] as const;
