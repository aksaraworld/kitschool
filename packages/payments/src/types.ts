/**
 * Copyright (c) 2025 Panji Tianda (panjitianda@gmail.com) - In behalf of Aksara Nirwana Tianda. All rights reserved.
 */

/**
 * Fee settings structure
 */
export interface FeeSettings {
  taxPercentage: number;
  adminFeePercentage: number;
  paymentGatewayFee?: PaymentGatewayFeeSettings;
  platformFee?: {
    percentage: number;
    enabled: boolean;
    minimumAmount: number;
    maximumAmount: number;
  };
  tax?: {
    type: 'include' | 'exclude';
    percentage: number;
    enabled: boolean;
  };
}

/**
 * Payment gateway fee settings
 */
export interface PaymentGatewayFeeSettings {
  paidByUser: boolean;
  percentage: number;
  fixedAmount: number;
  enabled: boolean;
}

/**
 * Payment calculation options
 */
export interface PaymentCalculationOptions {
  includeTax?: boolean;
  includeAdminFee?: boolean;
  lateFee?: number;
  discountAmount?: number;
  paymentMethod?: 'online' | 'offline' | 'manual';
  isOnlinePayment?: boolean;
}

/**
 * Payment calculation result
 */
export interface PaymentCalculationResult {
  baseAmount: number;
  subtotal: number;
  taxAmount: number;
  taxPercentage: number;
  taxType: 'include' | 'exclude';
  totalAfterTax: number;
  adminFeeAmount: number;
  adminFeePercentage: number;
  lateFee: number;
  gatewayFeeAmount: number;
  gatewayFeePercentage: number;
  gatewayFeeFixedAmount: number;
  gatewayFeePaidByUser: boolean;
  discountAmount: number;
  totalAmount: number;
  breakdown: {
    base: number;
    tax: number;
    totalAfterTax: number;
    adminFee: number;
    lateFee: number;
    gatewayFee: number;
    total: number;
  };
  calculation: {
    baseAmount: number;
    taxPercentage: number;
    taxAmount: number;
    adminFeePercentage: number;
    adminFeeAmount: number;
    gatewayFeeAmount: number;
    totalAmount: number;
  };
}

/**
 * Late fee calculation result
 */
export interface LateFeeResult {
  hoursOverdue: number;
  lateFeePercentage: number;
  lateFee: number;
  isOverdue: boolean;
  gracePeriodExceeded: boolean;
}

/**
 * Database adapter interface for fee settings
 */
export interface FeeSettingsAdapter {
  getFeeSettings(entityId: string): Promise<FeeSettings>;
}

/**
 * Payment calculation service configuration
 */
export interface PaymentCalculationConfig {
  feeSettingsAdapter: FeeSettingsAdapter;
  options?: {
    defaultTaxPercentage?: number;
    defaultAdminFeePercentage?: number;
    currency?: string;
    locale?: string;
    logLevel?: 'none' | 'error' | 'warn' | 'info' | 'debug';
  };
}
