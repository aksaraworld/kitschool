import { FeeProductLine, FeeStructure, FinanceUnit } from '@/lib/types';

/** Resolve finance unit from fee — supports legacy catalog without financeUnit field. */
export function resolveFeeFinanceUnit(fee: Pick<FeeStructure, 'financeUnit' | 'name' | 'productLine'>): FinanceUnit | null {
  const line = resolveProductLine(fee);
  if (!line) return null;
  if (line === FeeProductLine.BOTH) return null;
  return line as unknown as FinanceUnit;
}

/** User-facing product line for catalog & POS filtering. */
export function resolveProductLine(
  fee: Pick<FeeStructure, 'productLine' | 'financeUnit' | 'name'>
): FeeProductLine | null {
  if (fee.productLine) return fee.productLine;
  if (fee.financeUnit) {
    const u = fee.financeUnit as string;
    if (Object.values(FeeProductLine).includes(u as FeeProductLine)) return u as FeeProductLine;
  }
  const name = String(fee.name ?? '').toUpperCase();
  if (/\bMA\b/.test(name) || name.endsWith(' MA')) return FeeProductLine.MA;
  if (/\bMTS\b/.test(name) || name.includes('MTs')) return FeeProductLine.MTS;
  if (name.includes('PESANTREN') || name.includes('PONDOK')) return FeeProductLine.PESANTREN;
  if (name.includes('YAYASAN') || name.includes('TAHUNAN')) return FeeProductLine.YAYASAN;
  return null;
}

/** Finance unit recorded on invoice/POS — BOTH attributes to student's jenjang. */
export function billingFinanceUnit(
  fee: Pick<FeeStructure, 'productLine' | 'financeUnit' | 'name'>,
  studentUnit: FinanceUnit
): FinanceUnit {
  const line = resolveProductLine(fee);
  if (line === FeeProductLine.BOTH) return studentUnit;
  if (line === FeeProductLine.MTS) return FinanceUnit.MTS;
  if (line === FeeProductLine.MA) return FinanceUnit.MA;
  if (line === FeeProductLine.PESANTREN) return FinanceUnit.PESANTREN;
  if (line === FeeProductLine.YAYASAN) return FinanceUnit.YAYASAN;
  return studentUnit;
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

/** Catalog items visible for this student. */
export function feeAppliesToStudentJenjang(
  fee: Pick<FeeStructure, 'productLine' | 'financeUnit' | 'name' | 'isActive'>,
  studentUnit: FinanceUnit
): boolean {
  if (fee.isActive === false) return false;
  const line = resolveProductLine(fee);
  if (!line) return false;
  if (line === FeeProductLine.PESANTREN || line === FeeProductLine.YAYASAN) return true;
  if (line === FeeProductLine.BOTH) {
    return studentUnit === FinanceUnit.MTS || studentUnit === FinanceUnit.MA;
  }
  return (line as unknown as FinanceUnit) === studentUnit;
}

export function isSharedProductLine(line: FeeProductLine): boolean {
  return line === FeeProductLine.PESANTREN || line === FeeProductLine.YAYASAN;
}

export function filterCatalogForStudent<T extends Pick<FeeStructure, 'productLine' | 'financeUnit' | 'name' | 'isActive'>>(
  catalog: T[],
  student: { jenjang?: string; unitId?: string; unitLabel?: string } | null
): { shared: T[]; jenjang: T[]; studentUnit: FinanceUnit | null } {
  if (!student) return { shared: [], jenjang: [], studentUnit: null };
  const studentUnit = studentJenjangUnit(student);
  const applicable = catalog.filter((f) => feeAppliesToStudentJenjang(f, studentUnit));
  const shared = applicable.filter((f) => {
    const line = resolveProductLine(f);
    return line != null && isSharedProductLine(line);
  });
  const jenjang = applicable.filter((f) => {
    const line = resolveProductLine(f);
    return line != null && !isSharedProductLine(line);
  });
  return { shared, jenjang, studentUnit };
}

/** Map product line to financeUnit for legacy fields / Firestore compat. */
export function productLineToFinanceUnit(line: FeeProductLine): FinanceUnit {
  if (line === FeeProductLine.BOTH) return FinanceUnit.YAYASAN;
  return line as unknown as FinanceUnit;
}

export const JENJANG_FILTER_OPTIONS = [
  { value: '', label: 'Semua Jenjang' },
  { value: 'MTs', label: 'MTs' },
  { value: 'MA', label: 'MA' },
] as const;

export const PRODUCT_LINE_FILTER_OPTIONS: { value: FeeProductLine | ''; label: string }[] = [
  { value: '', label: 'Semua Lini' },
  { value: FeeProductLine.MTS, label: 'MTs' },
  { value: FeeProductLine.MA, label: 'MA' },
  { value: FeeProductLine.BOTH, label: 'MTs & MA' },
  { value: FeeProductLine.PESANTREN, label: 'Pesantren' },
  { value: FeeProductLine.YAYASAN, label: 'Yayasan' },
];
