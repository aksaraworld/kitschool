import { FeeProductLine, FeeStructure, FinanceUnit } from '@/lib/types';

/** All product lines on a fee (multi-select + legacy single field). */
export function resolveProductLines(
  fee: Pick<FeeStructure, 'productLine' | 'productLines' | 'financeUnit' | 'name'>
): FeeProductLine[] {
  if (fee.productLines?.length) return fee.productLines;
  const single = resolveProductLine(fee);
  return single ? [single] : [];
}

/** Resolve finance unit from fee — supports legacy catalog without financeUnit field. */
export function resolveFeeFinanceUnit(fee: Pick<FeeStructure, 'financeUnit' | 'name' | 'productLine' | 'productLines'>): FinanceUnit | null {
  const lines = resolveProductLines(fee);
  if (lines.length === 0) return null;
  const line = lines[0];
  if (line === FeeProductLine.BOTH) return null;
  return line as unknown as FinanceUnit;
}

/** User-facing product line for catalog & POS filtering (first line). */
export function resolveProductLine(
  fee: Pick<FeeStructure, 'productLine' | 'productLines' | 'financeUnit' | 'name'>
): FeeProductLine | null {
  if (fee.productLine) return fee.productLine;
  if (fee.productLines?.length) return fee.productLines[0];
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

/** Whether a single product line applies to the student's jenjang. */
export function productLineAppliesToStudent(line: FeeProductLine, studentUnit: FinanceUnit): boolean {
  if (line === FeeProductLine.PESANTREN || line === FeeProductLine.YAYASAN) return true;
  if (line === FeeProductLine.BOTH) {
    return studentUnit === FinanceUnit.MTS || studentUnit === FinanceUnit.MA;
  }
  return (line as unknown as FinanceUnit) === studentUnit;
}

/** Finance unit recorded on invoice/POS — BOTH attributes to student's jenjang. */
export function billingFinanceUnit(
  fee: Pick<FeeStructure, 'productLine' | 'productLines' | 'financeUnit' | 'name'>,
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

/** Fee applies if ANY selected product line matches the student. */
export function feeAppliesToStudentJenjang(
  fee: Pick<FeeStructure, 'productLine' | 'productLines' | 'financeUnit' | 'name' | 'isActive' | 'kind'>,
  studentUnit: FinanceUnit
): boolean {
  if (fee.isActive === false) return false;
  const lines = resolveProductLines(fee);
  if (lines.length === 0) return false;
  return lines.some((line) => productLineAppliesToStudent(line, studentUnit));
}

/** Recurring fees only (excludes POS products like Seragam/Kitab). */
export function isRecurringFee(
  fee: Pick<FeeStructure, 'kind'>
): boolean {
  return fee.kind !== 'product';
}

export function isSharedProductLine(line: FeeProductLine): boolean {
  return line === FeeProductLine.PESANTREN || line === FeeProductLine.YAYASAN;
}

export function filterCatalogForStudent<T extends Pick<FeeStructure, 'productLine' | 'productLines' | 'financeUnit' | 'name' | 'isActive' | 'kind'>>(
  catalog: T[],
  student: { jenjang?: string; unitId?: string; unitLabel?: string } | null,
  opts?: { productsOnly?: boolean; feesOnly?: boolean }
): { shared: T[]; jenjang: T[]; studentUnit: FinanceUnit | null } {
  if (!student) return { shared: [], jenjang: [], studentUnit: null };
  const studentUnit = studentJenjangUnit(student);
  let applicable = catalog.filter((f) => feeAppliesToStudentJenjang(f, studentUnit));
  if (opts?.productsOnly) applicable = applicable.filter((f) => f.kind === 'product');
  if (opts?.feesOnly) applicable = applicable.filter((f) => isRecurringFee(f));
  const shared = applicable.filter((f) => {
    const lines = resolveProductLines(f);
    return lines.some((line) => isSharedProductLine(line));
  });
  const jenjang = applicable.filter((f) => {
    const lines = resolveProductLines(f);
    return lines.length > 0 && lines.every((line) => !isSharedProductLine(line));
  });
  return { shared, jenjang, studentUnit };
}

/** Map product line to financeUnit for legacy fields / Firestore compat. */
export function productLineToFinanceUnit(line: FeeProductLine): FinanceUnit {
  if (line === FeeProductLine.BOTH) return FinanceUnit.YAYASAN;
  return line as unknown as FinanceUnit;
}

/** Normalize fee payload: productLines array + mirrored productLine. */
export function normalizeFeeProductLines(
  productLines?: FeeProductLine[],
  productLine?: FeeProductLine
): { productLines: FeeProductLine[]; productLine: FeeProductLine | undefined } {
  const lines =
    productLines?.length ? productLines : productLine ? [productLine] : [];
  return {
    productLines: lines,
    productLine: lines[0],
  };
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
