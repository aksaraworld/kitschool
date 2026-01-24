/**
 * Copyright (c) 2025 Panji Tianda (panjitianda@gmail.com) - In behalf of Aksara Nirwana Tianda. All rights reserved.
 */

export interface DateFormatOptions {
  locale?: string;
  year?: 'numeric' | '2-digit';
  month?: 'numeric' | '2-digit' | 'long' | 'short' | 'narrow';
  day?: 'numeric' | '2-digit';
  hour?: 'numeric' | '2-digit';
  minute?: 'numeric' | '2-digit';
  second?: 'numeric' | '2-digit';
  timeZoneName?: 'short' | 'long';
}

/**
 * Convert various date formats to Date object
 */
export function parseDate(dateInput: string | Date | any): Date | null {
  if (!dateInput) return null;

  // Already a Date object
  if (dateInput instanceof Date) {
    return isNaN(dateInput.getTime()) ? null : dateInput;
  }

  // Firestore Timestamp with _seconds
  if (typeof dateInput === 'object' && dateInput._seconds) {
    return new Date(dateInput._seconds * 1000);
  }

  // Firestore Timestamp with toDate method
  if (typeof dateInput === 'object' && typeof dateInput.toDate === 'function') {
    return dateInput.toDate();
  }

  // String date
  if (typeof dateInput === 'string') {
    const date = new Date(dateInput);
    return isNaN(date.getTime()) ? null : date;
  }

  return null;
}

/**
 * Format date with options
 */
export function formatDate(
  dateInput: string | Date | any,
  options: DateFormatOptions = {}
): string {
  const date = parseDate(dateInput);
  if (!date) return 'Tidak ada tanggal';

  const {
    locale = 'id-ID',
    year = 'numeric',
    month = 'long',
    day = 'numeric'
  } = options;

  return date.toLocaleDateString(locale, { year, month, day });
}

/**
 * Format date and time
 */
export function formatDateTime(
  dateInput: string | Date | any,
  options: DateFormatOptions = {}
): string {
  const date = parseDate(dateInput);
  if (!date) return 'Tidak ada tanggal';

  const {
    locale = 'id-ID',
    year = 'numeric',
    month = 'long',
    day = 'numeric',
    hour = 'numeric',
    minute = '2-digit'
  } = options;

  return date.toLocaleDateString(locale, {
    year,
    month,
    day,
    hour,
    minute
  });
}

/**
 * Get month name in Indonesian
 */
export function getMonthName(month: number, locale: string = 'id-ID'): string {
  const date = new Date(2000, month - 1, 1);
  return date.toLocaleDateString(locale, { month: 'long' });
}

/**
 * Get month names array
 */
export function getMonthNames(locale: string = 'id-ID'): string[] {
  return Array.from({ length: 12 }, (_, i) => {
    const date = new Date(2000, i, 1);
    return date.toLocaleDateString(locale, { month: 'long' });
  });
}
