/**
 * Copyright (c) 2025 Panji Tianda (panjitianda@gmail.com) - In behalf of Aksara Nirwana Tianda. All rights reserved.
 */

export interface CurrencyFormatOptions {
  locale?: string;
  currency?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

/**
 * Format number as currency
 */
export function formatCurrency(
  amount: number,
  options: CurrencyFormatOptions = {}
): string {
  const {
    locale = 'id-ID',
    currency = 'IDR',
    minimumFractionDigits = 0,
    maximumFractionDigits = 0
  } = options;

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits,
    maximumFractionDigits
  }).format(amount);
}

/**
 * Format number as Indonesian Rupiah (default)
 */
export function formatIDR(amount: number): string {
  return formatCurrency(amount, {
    locale: 'id-ID',
    currency: 'IDR',
    minimumFractionDigits: 0
  });
}
