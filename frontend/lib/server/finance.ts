/**
 * Core finance: fee catalog, billing, POS checkout, revenue reports.
 */

import type { AuthUser } from '@/lib/server/auth-helpers';
import { hasAnyRole } from '@/lib/server/auth-helpers';
import {
  feeStructuresCollection,
  invoicesCollection,
  paymentsCollection,
  posTransactionsCollection,
  cashFlowCollection,
  usersCollection,
  classesCollection,
  yearsCollection,
  docToJson,
} from '@/lib/server/firebase-admin';
import {
  FeeCategory,
  FeeFrequency,
  FinanceUnit,
  FINANCE_CATALOG_ROLES,
  FINANCE_POS_ROLES,
  FINANCE_REPORT_ROLES,
  InvoiceStatus,
  PaymentMethod,
  UserRole,
  type FeeStructure,
  type FinanceRevenueReport,
  type PosLineItem,
  type PosTransaction,
} from '@/lib/types';
import {
  resolveFeeFinanceUnit,
  studentJenjangUnit,
  feeAppliesToStudentJenjang,
} from '@/lib/finance-helpers';

export function canAccessPos(auth: AuthUser | null): boolean {
  return hasAnyRole(auth, FINANCE_POS_ROLES);
}

export function canManageCatalog(auth: AuthUser | null): boolean {
  return hasAnyRole(auth, FINANCE_CATALOG_ROLES);
}

export function canViewFinanceReports(auth: AuthUser | null): boolean {
  return hasAnyRole(auth, FINANCE_REPORT_ROLES);
}

/** Map student jenjang to finance unit. */
export function studentFinanceUnit(student: Record<string, unknown>): FinanceUnit {
  return studentJenjangUnit(student as { jenjang?: string; unitId?: string; unitLabel?: string });
}

/** Fee applies to this student based on finance unit. */
export function feeAppliesToStudent(fee: FeeStructure, studentUnit: FinanceUnit): boolean {
  return feeAppliesToStudentJenjang(fee, studentUnit);
}

export async function listActiveFees(schoolId: string): Promise<FeeStructure[]> {
  const snap = await feeStructuresCollection().where('schoolId', '==', schoolId).get();
  return snap.docs
    .map((d) => docToJson(d) as unknown as FeeStructure)
    .filter((f) => f.isActive !== false);
}

async function nextSequenceNumber(
  prefix: string,
  collection: ReturnType<typeof invoicesCollection>,
  schoolId: string
): Promise<string> {
  const year = new Date().getFullYear();
  const snap = await collection.where('schoolId', '==', schoolId).limit(500).get();
  let max = 0;
  const pattern = new RegExp(`^${prefix}-${year}-(\\d+)$`);
  for (const doc of snap.docs) {
    const num = String((doc.data() as { invoiceNumber?: string }).invoiceNumber ?? '');
    const m = num.match(pattern);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `${prefix}-${year}-${String(max + 1).padStart(4, '0')}`;
}

async function nextPosNumber(schoolId: string): Promise<string> {
  const year = new Date().getFullYear();
  const snap = await posTransactionsCollection().where('schoolId', '==', schoolId).limit(500).get();
  let max = 0;
  const pattern = new RegExp(`^POS-${year}-(\\d+)$`);
  for (const doc of snap.docs) {
    const num = String((doc.data() as { transactionNumber?: string }).transactionNumber ?? '');
    const m = num.match(pattern);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `POS-${year}-${String(max + 1).padStart(4, '0')}`;
}

async function findParentForStudent(studentId: string, schoolId: string): Promise<string | undefined> {
  const snap = await usersCollection()
    .where('schoolId', '==', schoolId)
    .where('role', '==', UserRole.PARENT)
    .limit(200)
    .get();
  for (const doc of snap.docs) {
    const children = (doc.data() as { children?: string[] }).children ?? [];
    if (children.includes(studentId)) return doc.id;
  }
  return undefined;
}

/** Check duplicate monthly/yearly bill for student + fee. */
async function billAlreadyExists(
  schoolId: string,
  studentId: string,
  feeStructureId: string,
  month?: number,
  year?: number
): Promise<boolean> {
  let q = invoicesCollection()
    .where('schoolId', '==', schoolId)
    .where('studentId', '==', studentId)
    .where('feeStructureId', '==', feeStructureId);
  if (month != null) q = q.where('month', '==', month) as ReturnType<typeof invoicesCollection>;
  if (year != null) q = q.where('year', '==', year) as ReturnType<typeof invoicesCollection>;
  const snap = await q.limit(1).get();
  return !snap.empty;
}

export async function createBillFromFee(
  schoolId: string,
  student: Record<string, unknown> & { _id: string; name?: string },
  fee: FeeStructure,
  createdBy: string,
  opts?: { month?: number; year?: number; dueDate?: Date }
): Promise<string | null> {
  const studentUnit = studentFinanceUnit(student);
  if (!feeAppliesToStudent(fee, studentUnit)) return null;

  const now = new Date();
  const month = opts?.month ?? (fee.frequency === FeeFrequency.MONTHLY ? now.getMonth() + 1 : undefined);
  const year = opts?.year ?? now.getFullYear();

  if (fee.frequency === FeeFrequency.MONTHLY || fee.frequency === FeeFrequency.YEARLY) {
    const exists = await billAlreadyExists(schoolId, student._id, fee._id, month, year);
    if (exists) return null;
  }

  const parentId = (await findParentForStudent(student._id, schoolId)) ?? '';
  const invoiceNumber = await nextSequenceNumber('INV', invoicesCollection(), schoolId);
  const dueDate = opts?.dueDate ?? new Date(year, month != null ? month : now.getMonth(), 10);
  const amount = fee.amountBase;

  const ref = invoicesCollection().doc();
  await ref.set({
    schoolId,
    invoiceNumber,
    studentId: student._id,
    parentId,
    studentName: student.name ?? '',
    amount,
    dueDate,
    paidAmount: 0,
    remainingAmount: amount,
    status: InvoiceStatus.PENDING,
    description: fee.name,
    items: [
      {
        description: fee.name,
        quantity: 1,
        price: amount,
        total: amount,
        feeStructureId: fee._id,
        financeUnit: fee.financeUnit,
        category: fee.category,
      },
    ],
    financeUnit: fee.financeUnit,
    category: fee.category,
    feeStructureId: fee._id,
    month,
    year,
    createdBy,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return ref.id;
}

/** Generate recurring bills for all active students. */
export async function generateBillsForSchool(
  schoolId: string,
  createdBy: string,
  opts?: { month?: number; year?: number; studentId?: string; frequency?: FeeFrequency }
): Promise<{ created: number; skipped: number }> {
  const fees = await listActiveFees(schoolId);
  const targetFees = fees.filter((f) => {
    if (opts?.frequency) return f.frequency === opts.frequency;
    return f.frequency === FeeFrequency.MONTHLY || f.frequency === FeeFrequency.YEARLY;
  });

  let studentsQuery = usersCollection().where('schoolId', '==', schoolId).where('role', '==', UserRole.STUDENT);
  const studentsSnap = await studentsQuery.get();
  let students = studentsSnap.docs.map((d) => ({ ...docToJson(d), _id: d.id }));
  if (opts?.studentId) students = students.filter((s) => s._id === opts.studentId);

  let created = 0;
  let skipped = 0;
  for (const student of students) {
    for (const fee of targetFees) {
      const id = await createBillFromFee(schoolId, student, fee, createdBy, {
        month: opts?.month,
        year: opts?.year,
      });
      if (id) created++;
      else skipped++;
    }
  }
  return { created, skipped };
}

export type PosCheckoutInput = {
  schoolId: string;
  studentId: string;
  invoiceIds?: string[];
  catalogItems?: { feeStructureId: string; quantity?: number }[];
  amountPaid: number;
  notes?: string;
  processedBy: string;
  processedByName?: string;
};

export type PosCheckoutResult = {
  transactionId: string;
  transactionNumber: string;
  change?: number;
};

export async function processPosCheckout(input: PosCheckoutInput): Promise<PosCheckoutResult> {
  const studentDoc = await usersCollection().doc(input.studentId).get();
  if (!studentDoc.exists) throw new Error('Siswa tidak ditemukan');
  const student = { ...docToJson(studentDoc), _id: studentDoc.id } as Record<string, unknown> & { _id: string };
  const studentName = String(student.name ?? 'Siswa');
  const parentId = (await findParentForStudent(input.studentId, input.schoolId)) ?? '';

  const lineItems: PosLineItem[] = [];
  const paidInvoiceIds: string[] = [];
  const breakdown: Partial<Record<FinanceUnit, number>> = {};

  const addToBreakdown = (unit: FinanceUnit, amount: number) => {
    breakdown[unit] = (breakdown[unit] ?? 0) + amount;
  };

  // Pay outstanding invoices
  if (input.invoiceIds?.length) {
    for (const invId of input.invoiceIds) {
      const invRef = invoicesCollection().doc(invId);
      const invSnap = await invRef.get();
      if (!invSnap.exists) continue;
      const inv = invSnap.data() as Record<string, unknown>;
      if (inv.schoolId !== input.schoolId || inv.studentId !== input.studentId) continue;
      const remaining = Number(inv.remainingAmount ?? 0);
      if (remaining <= 0) continue;

      lineItems.push({
        invoiceId: invId,
        description: String(inv.description ?? inv.invoiceNumber ?? 'Tagihan'),
        quantity: 1,
        unitPrice: remaining,
        total: remaining,
        financeUnit: (inv.financeUnit as FinanceUnit) ?? FinanceUnit.YAYASAN,
        category: inv.category as FeeCategory | undefined,
      });
      addToBreakdown(
        (inv.financeUnit as FinanceUnit) ?? FinanceUnit.YAYASAN,
        remaining
      );
      paidInvoiceIds.push(invId);

      await invRef.update({
        paidAmount: Number(inv.amount ?? remaining),
        remainingAmount: 0,
        status: InvoiceStatus.PAID,
        updatedAt: new Date(),
      });
    }
  }

  // Ad-hoc catalog items (creates + pays invoice in one step)
  if (input.catalogItems?.length) {
    const fees = await listActiveFees(input.schoolId);
    const feeMap = new Map(fees.map((f) => [f._id, f]));
    for (const item of input.catalogItems) {
      const fee = feeMap.get(item.feeStructureId);
      if (!fee) continue;
      const qty = item.quantity ?? 1;
      const total = fee.amountBase * qty;
      const invNumber = await nextSequenceNumber('INV', invoicesCollection(), input.schoolId);
      const invRef = invoicesCollection().doc();
      await invRef.set({
        schoolId: input.schoolId,
        invoiceNumber: invNumber,
        studentId: input.studentId,
        parentId,
        studentName,
        amount: total,
        dueDate: new Date(),
        paidAmount: total,
        remainingAmount: 0,
        status: InvoiceStatus.PAID,
        description: fee.name,
        items: [
          {
            description: fee.name,
            quantity: qty,
            price: fee.amountBase,
            total,
            feeStructureId: fee._id,
            financeUnit: fee.financeUnit,
            category: fee.category,
          },
        ],
        financeUnit: fee.financeUnit,
        category: fee.category,
        feeStructureId: fee._id,
        createdBy: input.processedBy,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      paidInvoiceIds.push(invRef.id);
      lineItems.push({
        feeStructureId: fee._id,
        invoiceId: invRef.id,
        description: fee.name,
        quantity: qty,
        unitPrice: fee.amountBase,
        total,
        financeUnit: fee.financeUnit,
        category: fee.category,
      });
      addToBreakdown(fee.financeUnit, total);
    }
  }

  const subtotal = lineItems.reduce((s, i) => s + i.total, 0);
  if (subtotal <= 0) throw new Error('Tidak ada item untuk dibayar');
  if (input.amountPaid < subtotal) throw new Error('Jumlah bayar kurang dari total tagihan');

  const transactionNumber = await nextPosNumber(input.schoolId);
  const posRef = posTransactionsCollection().doc();
  const now = new Date();

  await posRef.set({
    schoolId: input.schoolId,
    transactionNumber,
    studentId: input.studentId,
    parentId,
    studentName,
    items: lineItems,
    subtotal,
    amountPaid: input.amountPaid,
    paymentMethod: PaymentMethod.CASH,
    invoiceIds: paidInvoiceIds,
    processedBy: input.processedBy,
    processedByName: input.processedByName ?? '',
    notes: input.notes ?? '',
    breakdownByUnit: breakdown,
    createdAt: now,
    updatedAt: now,
  });

  // Legacy payments collection
  await paymentsCollection().doc().set({
    schoolId: input.schoolId,
    studentId: input.studentId,
    parentId,
    amount: subtotal,
    paymentMethod: PaymentMethod.CASH,
    status: 'completed',
    posTransactionId: posRef.id,
    transactionNumber,
    processedBy: input.processedBy,
    createdAt: now,
    updatedAt: now,
  });

  // Cash flow entry
  await cashFlowCollection().doc().set({
    schoolId: input.schoolId,
    type: 'in',
    amount: subtotal,
    description: `POS ${transactionNumber} — ${studentName}`,
    category: 'pos_payment',
    financeUnit: 'mixed',
    posTransactionId: posRef.id,
    date: now.toISOString().slice(0, 10),
    createdBy: input.processedBy,
    createdAt: now,
    updatedAt: now,
  });

  return {
    transactionId: posRef.id,
    transactionNumber,
    change: input.amountPaid - subtotal,
  };
}

export type PosStudentRow = {
  _id: string;
  name: string;
  nisn?: string;
  admissionNo?: string;
  jenjang?: string;
  classId?: string;
  className?: string;
  yearId?: string;
  yearName?: string;
  email?: string;
  matchScore?: number;
  matchLabel?: string;
  isRecent?: boolean;
};

export type PosStudentSearchOptions = {
  query?: string;
  yearId?: string;
  classId?: string;
  jenjang?: string;
  limit?: number;
};

function scoreStudentMatch(student: Record<string, unknown>, q: string): { score: number; label: string } {
  if (!q) return { score: 0, label: 'saran' };
  const name = String(student.name ?? '').toLowerCase();
  const nisn = String(student.nisn ?? student.studentId ?? '').toLowerCase();
  const admission = String(student.admissionNo ?? '').toLowerCase();
  const email = String(student.email ?? '').toLowerCase();

  if (nisn === q || admission === q) return { score: 100, label: 'cocok persis' };
  if (name === q) return { score: 95, label: 'nama persis' };
  if (name.startsWith(q)) return { score: 80, label: 'nama' };
  if (nisn.startsWith(q) || admission.startsWith(q)) return { score: 75, label: 'nomor' };
  if (name.includes(q)) return { score: 60, label: 'nama' };
  if (email.includes(q)) return { score: 40, label: 'email' };
  return { score: 0, label: '' };
}

export async function searchStudentsForPos(
  schoolId: string,
  options: PosStudentSearchOptions = {}
): Promise<PosStudentRow[]> {
  const q = (options.query ?? '').trim().toLowerCase();
  const limit = options.limit ?? 30;

  const [studentsSnap, classesSnap, yearsSnap, recentPosSnap] = await Promise.all([
    usersCollection().where('schoolId', '==', schoolId).where('role', '==', UserRole.STUDENT).limit(500).get(),
    classesCollection().where('schoolId', '==', schoolId).get(),
    yearsCollection().where('schoolId', '==', schoolId).get(),
    posTransactionsCollection().where('schoolId', '==', schoolId).limit(50).get(),
  ]);

  const classMap = new Map<string, Record<string, unknown>>();
  for (const doc of classesSnap.docs) {
    classMap.set(doc.id, { ...docToJson(doc), _id: doc.id });
  }
  const yearMap = new Map<string, string>();
  for (const doc of yearsSnap.docs) {
    const y = docToJson(doc);
    yearMap.set(doc.id, String(y.name ?? doc.id));
  }

  const recentStudentIds = new Set<string>();
  const recentOrdered: string[] = [];
  const posSorted = recentPosSnap.docs
    .map((d) => docToJson(d))
    .sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')));
  for (const tx of posSorted) {
    const sid = String(tx.studentId ?? '');
    if (sid && !recentStudentIds.has(sid)) {
      recentStudentIds.add(sid);
      recentOrdered.push(sid);
    }
  }

  let classFilterIds: Set<string> | null = null;
  if (options.classId) {
    classFilterIds = new Set([options.classId]);
  } else if (options.yearId) {
    classFilterIds = new Set(
      classesSnap.docs
        .filter((d) => (d.data() as { yearId?: string }).yearId === options.yearId)
        .map((d) => d.id)
    );
  }

  const enrich = (raw: Record<string, unknown>, id: string): PosStudentRow => {
    const classId = String(raw.classId ?? '');
    const cls = classId ? classMap.get(classId) : undefined;
    const classJenjang = String(cls?.jenjang ?? '');
    const yearId = String(cls?.yearId ?? '');
    const jenjang = String(raw.jenjang ?? classJenjang ?? '');
    return {
      _id: id,
      name: String(raw.name ?? ''),
      nisn: raw.nisn ? String(raw.nisn) : raw.studentId ? String(raw.studentId) : undefined,
      admissionNo: raw.admissionNo ? String(raw.admissionNo) : undefined,
      jenjang: jenjang || undefined,
      classId: classId || undefined,
      className: cls ? String(cls.name ?? '') : undefined,
      yearId: yearId || undefined,
      yearName: yearId ? yearMap.get(yearId) : undefined,
      email: raw.email ? String(raw.email) : undefined,
    };
  };

  let rows = studentsSnap.docs.map((d) => {
    const raw = docToJson(d);
    const row = enrich(raw, d.id);
    const match = scoreStudentMatch(raw, q);
    return {
      ...row,
      matchScore: match.score,
      matchLabel: match.label,
      isRecent: recentStudentIds.has(d.id),
      _rawJenjang: row.jenjang,
      _classId: row.classId,
    };
  });

  if (options.jenjang) {
    const j = options.jenjang.toUpperCase();
    rows = rows.filter((s) => String(s.jenjang ?? '').toUpperCase().includes(j));
  }

  if (classFilterIds) {
    rows = rows.filter((s) => {
      if (s._classId && classFilterIds!.has(s._classId)) return true;
      for (const cid of classFilterIds!) {
        const cls = classMap.get(cid);
        const ids = (cls?.studentIds as string[]) ?? [];
        if (ids.includes(s._id)) return true;
      }
      return false;
    });
  }

  if (q) {
    rows = rows.filter((s) => s.matchScore > 0);
    rows.sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0) || a.name.localeCompare(b.name));
  } else {
    rows.sort((a, b) => {
      if (a.isRecent !== b.isRecent) return a.isRecent ? -1 : 1;
      const aRecent = recentOrdered.indexOf(a._id);
      const bRecent = recentOrdered.indexOf(b._id);
      if (aRecent >= 0 && bRecent >= 0) return aRecent - bRecent;
      return a.name.localeCompare(b.name);
    });
    rows = rows.map((s) => ({
      ...s,
      matchLabel: s.isRecent ? 'baru dibayar' : 'saran',
      matchScore: s.isRecent ? 50 : 10,
    }));
  }

  return rows.slice(0, limit).map(({ _rawJenjang: _, _classId: __, ...rest }) => rest);
}

export async function getRevenueReport(
  schoolId: string,
  from: string,
  to: string,
  financeUnitFilter?: FinanceUnit
): Promise<FinanceRevenueReport> {
  const snap = await posTransactionsCollection().where('schoolId', '==', schoolId).limit(500).get();
  const fromDate = new Date(from);
  const toDate = new Date(to);
  toDate.setHours(23, 59, 59, 999);

  const transactions: PosTransaction[] = [];
  const totals = { all: 0, mts: 0, ma: 0, pesantren: 0, yayasan: 0 };
  const byCategory: Partial<Record<FeeCategory, number>> = {};

  for (const doc of snap.docs) {
    const raw = docToJson(doc) as unknown as PosTransaction;
    const created = new Date(raw.createdAt);
    if (created < fromDate || created > toDate) continue;

    if (financeUnitFilter) {
      const unitTotal = raw.breakdownByUnit?.[financeUnitFilter] ?? 0;
      if (unitTotal <= 0) continue;
    }

    transactions.push(raw);

    for (const [unit, amount] of Object.entries(raw.breakdownByUnit ?? {})) {
      const n = Number(amount) || 0;
      if (financeUnitFilter && unit !== financeUnitFilter) continue;
      totals.all += n;
      if (unit === FinanceUnit.MTS) totals.mts += n;
      else if (unit === FinanceUnit.MA) totals.ma += n;
      else if (unit === FinanceUnit.PESANTREN) totals.pesantren += n;
      else if (unit === FinanceUnit.YAYASAN) totals.yayasan += n;
    }

    for (const item of raw.items ?? []) {
      if (item.category) {
        const cat = item.category as FeeCategory;
        if (financeUnitFilter && item.financeUnit !== financeUnitFilter) continue;
        byCategory[cat] = (byCategory[cat] ?? 0) + item.total;
      }
    }
  }

  transactions.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

  return {
    period: { from, to },
    totals,
    byCategory,
    transactionCount: transactions.length,
    recentTransactions: transactions.slice(0, 20),
  };
}
