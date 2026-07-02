/**
 * Academic-year payment schedule engine — expands payment plans into invoice rows.
 */

import {
  buildAcademicPeriods,
  dueDateForPeriod,
  periodRelation,
  pickActiveAcademicYear,
} from '@/lib/academic-period';
import { studentJenjangUnit } from '@/lib/finance-helpers';
import {
  docToJson,
  invoicesCollection,
  paymentPlansCollection,
  priceGroupsCollection,
  usersCollection,
  yearsCollection,
} from '@/lib/server/firebase-admin';
import type { AcademicYear, PaymentPlan, PlanItem, PriceGroup } from '@/lib/types';
import {
  FeeCategory,
  FinanceUnit,
  InvoiceStatus,
  UserRole,
} from '@/lib/types';

export async function getActiveAcademicYear(
  schoolId: string
): Promise<(AcademicYear & { _id: string }) | null> {
  const snap = await yearsCollection().where('schoolId', '==', schoolId).get();
  const years = snap.docs.map((d) => ({ ...docToJson(d), _id: d.id } as AcademicYear & { _id: string }));
  return pickActiveAcademicYear(years) as (AcademicYear & { _id: string }) | null;
}

export async function getDefaultPriceGroup(
  schoolId: string
): Promise<(PriceGroup & { _id: string }) | null> {
  const defSnap = await priceGroupsCollection()
    .where('schoolId', '==', schoolId)
    .where('isDefault', '==', true)
    .limit(1)
    .get();
  if (!defSnap.empty) {
    return { ...docToJson(defSnap.docs[0]), _id: defSnap.docs[0].id } as PriceGroup & { _id: string };
  }
  const anySnap = await priceGroupsCollection().where('schoolId', '==', schoolId).limit(1).get();
  if (anySnap.empty) return null;
  return { ...docToJson(anySnap.docs[0]), _id: anySnap.docs[0].id } as PriceGroup & { _id: string };
}

export async function getActivePaymentPlan(
  schoolId: string,
  yearId: string,
  priceGroupId?: string | null
): Promise<(PaymentPlan & { _id: string }) | null> {
  const snap = await paymentPlansCollection()
    .where('schoolId', '==', schoolId)
    .where('yearId', '==', yearId)
    .where('isActive', '==', true)
    .get();
  const plans = snap.docs.map(
    (d) => ({ ...docToJson(d), _id: d.id }) as PaymentPlan & { _id: string }
  );
  if (plans.length === 0) return null;
  if (priceGroupId) {
    const match = plans.find((p) => p.scope?.priceGroupId === priceGroupId);
    if (match) return match;
  }
  return plans.find((p) => !p.scope?.priceGroupId) ?? plans[0];
}

function planItemAppliesToStudent(item: PlanItem, studentUnit: FinanceUnit): boolean {
  if (item.financeUnit === FinanceUnit.PESANTREN || item.financeUnit === FinanceUnit.YAYASAN) return true;
  if (item.financeUnit === studentUnit) return true;
  return false;
}

/** Amount for one academic month (1=Jul .. 12=Jun). */
export function planItemAmountForMonth(item: PlanItem, academicMonth: number): number {
  if (item.monthlyAmounts?.length === 12) {
    const v = Number(item.monthlyAmounts[academicMonth - 1] ?? 0);
    return v > 0 ? v : 0;
  }
  if (item.type === 'yearly') {
    if (academicMonth === 1) return item.amount;
    return 0;
  }
  return item.amount;
}

function statusForNewInvoice(
  relation: 'past' | 'current' | 'future',
  dueDate: Date,
  now: Date
): InvoiceStatus {
  if (relation === 'future') return InvoiceStatus.SCHEDULED;
  if (relation === 'current') return InvoiceStatus.PENDING;
  if (now > dueDate) return InvoiceStatus.OVERDUE;
  return InvoiceStatus.PENDING;
}

async function planInvoiceExists(
  schoolId: string,
  studentId: string,
  planItemId: string,
  month: number,
  year: number
): Promise<boolean> {
  const snap = await invoicesCollection()
    .where('schoolId', '==', schoolId)
    .where('studentId', '==', studentId)
    .where('planItemId', '==', planItemId)
    .where('month', '==', month)
    .where('year', '==', year)
    .limit(1)
    .get();
  return !snap.empty;
}

async function nextInvoiceNumber(schoolId: string): Promise<string> {
  const year = new Date().getFullYear();
  const snap = await invoicesCollection().where('schoolId', '==', schoolId).limit(500).get();
  let max = 0;
  const pattern = new RegExp(`^INV-${year}-(\\d+)$`);
  for (const doc of snap.docs) {
    const num = String((doc.data() as { invoiceNumber?: string }).invoiceNumber ?? '');
    const m = num.match(pattern);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `INV-${year}-${String(max + 1).padStart(4, '0')}`;
}

async function findParentForStudent(studentId: string, schoolId: string): Promise<string> {
  const snap = await usersCollection()
    .where('schoolId', '==', schoolId)
    .where('role', '==', UserRole.PARENT)
    .limit(200)
    .get();
  for (const doc of snap.docs) {
    const children = (doc.data() as { children?: string[] }).children ?? [];
    if (children.includes(studentId)) return doc.id;
  }
  return '';
}

export type ScheduleGenerateResult = { created: number; skipped: number };

export async function generateScheduleFromPlans(
  schoolId: string,
  createdBy: string,
  opts?: { studentId?: string; academicYear?: AcademicYear & { _id: string } }
): Promise<ScheduleGenerateResult> {
  const academicYear = opts?.academicYear ?? (await getActiveAcademicYear(schoolId));
  if (!academicYear) return { created: 0, skipped: 0 };

  const periods = buildAcademicPeriods(academicYear);
  const now = new Date();

  let studentsQuery = usersCollection()
    .where('schoolId', '==', schoolId)
    .where('role', '==', UserRole.STUDENT);
  const studentsSnap = await studentsQuery.get();
  let students = studentsSnap.docs.map((d) => ({ ...docToJson(d), _id: d.id }));
  if (opts?.studentId) students = students.filter((s) => s._id === opts.studentId);

  const defaultGroup = await getDefaultPriceGroup(schoolId);
  let created = 0;
  let skipped = 0;

  for (const student of students) {
    const studentRecord = student as Record<string, unknown> & { _id: string; name?: string };
    const studentUnit = studentJenjangUnit(
      studentRecord as { jenjang?: string; unitId?: string; unitLabel?: string }
    );
    const priceGroupId =
      String(studentRecord.priceGroupId ?? '') ||
      defaultGroup?._id ||
      '';
    const plan = await getActivePaymentPlan(schoolId, academicYear._id, priceGroupId || null);
    if (!plan?.items?.length) {
      skipped++;
      continue;
    }

    const parentId = (await findParentForStudent(studentRecord._id, schoolId)) || '';

    for (const item of plan.items) {
      if (!planItemAppliesToStudent(item, studentUnit)) {
        skipped++;
        continue;
      }

      const activeMonths =
        item.months?.length === 12 ? item.months : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

      for (const academicMonth of activeMonths) {
        const amount = planItemAmountForMonth(item, academicMonth);
        if (amount <= 0) continue;

        const period = periods[academicMonth - 1];
        if (!period) continue;

        const exists = await planInvoiceExists(
          schoolId,
          studentRecord._id,
          item.id,
          period.calendarMonth,
          period.calendarYear
        );
        if (exists) {
          skipped++;
          continue;
        }

        const relation = periodRelation(
          academicYear,
          period.calendarMonth,
          period.calendarYear,
          now
        );
        const dueDay = item.dueDay ?? 10;
        const dueDate = dueDateForPeriod(period.calendarMonth, period.calendarYear, dueDay);
        const status = statusForNewInvoice(relation, dueDate, now);
        const invoiceNumber = await nextInvoiceNumber(schoolId);
        const ref = invoicesCollection().doc();

        const monthLabel = [
          'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
          'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        ][academicMonth - 1];

        await ref.set({
          schoolId,
          invoiceNumber,
          studentId: studentRecord._id,
          parentId,
          studentName: String(studentRecord.name ?? ''),
          amount,
          dueDate,
          paidAmount: 0,
          remainingAmount: amount,
          status,
          description: `${item.name} — ${monthLabel}`,
          items: [
            {
              description: item.name,
              quantity: 1,
              price: amount,
              total: amount,
              feeStructureId: item.feeStructureId,
              financeUnit: item.financeUnit,
              category: item.category,
            },
          ],
          financeUnit: item.financeUnit,
          category: item.category ?? FeeCategory.MONTHLY_SCHOOL,
          feeStructureId: item.feeStructureId,
          month: period.calendarMonth,
          year: period.calendarYear,
          academicYearId: academicYear._id,
          paymentPlanId: plan._id,
          planItemId: item.id,
          createdBy,
          createdAt: now,
          updatedAt: now,
        });
        created++;
      }
    }
  }

  return { created, skipped };
}

/** Cron: flip SCHEDULED -> PENDING for current month; mark overdue. */
export async function rollInvoiceScheduleStatuses(schoolId: string): Promise<{
  activated: number;
  overdue: number;
}> {
  const academicYear = await getActiveAcademicYear(schoolId);
  if (!academicYear) return { activated: 0, overdue: 0 };

  const now = new Date();
  const snap = await invoicesCollection()
    .where('schoolId', '==', schoolId)
    .where('academicYearId', '==', academicYear._id)
    .get();

  let activated = 0;
  let overdue = 0;

  for (const doc of snap.docs) {
    const inv = doc.data() as {
      status?: string;
      month?: number;
      year?: number;
      dueDate?: Date | string;
      paidAmount?: number;
      remainingAmount?: number;
    };
    const status = String(inv.status ?? '');
    if (status === InvoiceStatus.PAID || status === InvoiceStatus.CANCELLED) continue;

    const month = Number(inv.month);
    const year = Number(inv.year);
    if (!month || !year) continue;

    const relation = periodRelation(academicYear, month, year, now);
    const dueDate = inv.dueDate ? new Date(inv.dueDate) : dueDateForPeriod(month, year);

    if (status === InvoiceStatus.SCHEDULED && relation === 'current') {
      await doc.ref.update({ status: InvoiceStatus.PENDING, updatedAt: now });
      activated++;
      continue;
    }

    if (
      (status === InvoiceStatus.PENDING || status === InvoiceStatus.SCHEDULED) &&
      relation === 'past' &&
      now > dueDate
    ) {
      await doc.ref.update({ status: InvoiceStatus.OVERDUE, updatedAt: now });
      overdue++;
    }
  }

  return { activated, overdue };
}

/** Build a default 12-month amount array (equal split or custom). */
export function buildMonthlyAmounts(
  totalOrMonthly: number,
  mode: 'equal_monthly' | 'yearly_july' | 'custom',
  custom?: number[]
): number[] {
  if (mode === 'custom' && custom?.length === 12) return custom;
  if (mode === 'yearly_july') {
    const arr = new Array(12).fill(0);
    arr[0] = totalOrMonthly;
    return arr;
  }
  return new Array(12).fill(totalOrMonthly);
}

/** Preset plan items for common school structures. */
export function buildPlanPreset(
  preset: 'monthly_only' | 'yearly_only' | 'yearly_split_custom' | 'combined',
  params: {
    monthlyAmount?: number;
    yearlyAmount?: number;
    customMonthlyAmounts?: number[];
    name?: string;
    financeUnit?: FinanceUnit;
  }
): PlanItem[] {
  const fu = params.financeUnit ?? FinanceUnit.YAYASAN;
  const id = () => `item_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  if (preset === 'monthly_only') {
    return [
      {
        id: id(),
        name: params.name ?? 'SPP Bulanan',
        category: FeeCategory.MONTHLY_SCHOOL,
        financeUnit: fu,
        type: 'monthly',
        amount: params.monthlyAmount ?? 500_000,
      },
    ];
  }
  if (preset === 'yearly_only') {
    return [
      {
        id: id(),
        name: params.name ?? 'Iuran Tahunan',
        category: FeeCategory.YEARLY,
        financeUnit: fu,
        type: 'yearly',
        amount: params.yearlyAmount ?? 10_000_000,
        monthlyAmounts: buildMonthlyAmounts(params.yearlyAmount ?? 10_000_000, 'yearly_july'),
      },
    ];
  }
  if (preset === 'yearly_split_custom') {
    return [
      {
        id: id(),
        name: params.name ?? 'Iuran Tahunan (Cicilan)',
        category: FeeCategory.YEARLY,
        financeUnit: fu,
        type: 'yearly',
        amount: params.yearlyAmount ?? 25_000_000,
        monthlyAmounts:
          params.customMonthlyAmounts ??
          buildMonthlyAmounts(0, 'custom', [
            5_300_000, 5_300_000, 5_300_000, 1_000_000, 1_000_000, 1_000_000,
            1_000_000, 1_000_000, 1_000_000, 1_000_000, 1_000_000, 1_000_000,
          ]),
      },
    ];
  }
  return [
    {
      id: id(),
      name: 'Iuran Tahunan',
      category: FeeCategory.YEARLY,
      financeUnit: fu,
      type: 'yearly',
      amount: params.yearlyAmount ?? 10_000_000,
      monthlyAmounts: buildMonthlyAmounts(params.yearlyAmount ?? 10_000_000, 'yearly_july'),
    },
    {
      id: id(),
      name: 'SPP Bulanan',
      category: FeeCategory.MONTHLY_SCHOOL,
      financeUnit: fu,
      type: 'monthly',
      amount: params.monthlyAmount ?? 500_000,
    },
  ];
}
