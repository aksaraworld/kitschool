/**
 * Academic year period helpers (Jul–Jun).
 * academicMonth 1 = July, 12 = June of the following calendar year.
 */

import type { AcademicYear } from '@/lib/types';

export type AcademicPeriod = {
  /** 1–12 where 1 = July, 12 = June */
  academicMonth: number;
  calendarMonth: number;
  calendarYear: number;
};

const ACADEMIC_MONTH_LABELS = [
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
];

export function academicMonthLabel(academicMonth: number): string {
  return ACADEMIC_MONTH_LABELS[academicMonth - 1] ?? `Bulan ${academicMonth}`;
}

/** Parse academic year start calendar year from year doc (Jul start). */
export function academicStartCalendarYear(year: Pick<AcademicYear, 'startDate' | 'name'>): number {
  if (year.startDate) {
    const d = new Date(year.startDate);
    if (!Number.isNaN(d.getTime())) return d.getFullYear();
  }
  const m = String(year.name ?? '').match(/(\d{4})/);
  if (m) return parseInt(m[1], 10);
  return new Date().getFullYear();
}

/** Build 12 periods Jul..Jun for an academic year. */
export function buildAcademicPeriods(year: Pick<AcademicYear, 'startDate' | 'name'>): AcademicPeriod[] {
  const startYear = academicStartCalendarYear(year);
  const periods: AcademicPeriod[] = [];
  for (let am = 1; am <= 12; am++) {
    const calendarMonth = am <= 6 ? am + 6 : am - 6;
    const calendarYear = am <= 6 ? startYear : startYear + 1;
    periods.push({ academicMonth: am, calendarMonth, calendarYear });
  }
  return periods;
}

/** Which academic month (1–12) is `date` in for the given academic year? */
export function academicMonthForDate(
  year: Pick<AcademicYear, 'startDate' | 'name'>,
  date: Date = new Date()
): number | null {
  const periods = buildAcademicPeriods(year);
  const cm = date.getMonth() + 1;
  const cy = date.getFullYear();
  const match = periods.find((p) => p.calendarMonth === cm && p.calendarYear === cy);
  return match?.academicMonth ?? null;
}

export type PeriodRelation = 'past' | 'current' | 'future';

/** Compare a billing period to today within the academic year. */
export function periodRelation(
  year: Pick<AcademicYear, 'startDate' | 'name'>,
  calendarMonth: number,
  calendarYear: number,
  now: Date = new Date()
): PeriodRelation {
  const currentAm = academicMonthForDate(year, now);
  const periods = buildAcademicPeriods(year);
  const target = periods.find((p) => p.calendarMonth === calendarMonth && p.calendarYear === calendarYear);
  if (!target || currentAm == null) return 'future';
  if (target.academicMonth < currentAm) return 'past';
  if (target.academicMonth > currentAm) return 'future';
  return 'current';
}

/** Due date for a period (default day 10 of calendar month). */
export function dueDateForPeriod(
  calendarMonth: number,
  calendarYear: number,
  dueDay = 10
): Date {
  const day = Math.min(Math.max(dueDay, 1), 28);
  return new Date(calendarYear, calendarMonth - 1, day);
}

/** Pick active academic year from a list (isActive flag, else newest startDate). */
export function pickActiveAcademicYear<T extends Pick<AcademicYear, 'startDate' | 'isActive'>>(
  years: T[]
): T | null {
  if (years.length === 0) return null;
  const sorted = [...years].sort((a, b) =>
    String(b.startDate ?? '').localeCompare(String(a.startDate ?? ''))
  );
  return sorted.find((y) => y.isActive) ?? sorted[0];
}
