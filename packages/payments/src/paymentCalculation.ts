/**
 * Copyright (c) 2025 Panji Tianda (panjitianda@gmail.com) - In behalf of Aksara Nirwana Tianda. All rights reserved.
 */

import {
  FeeSettings,
  PaymentCalculationOptions,
  PaymentCalculationResult,
  PaymentCalculationConfig
} from './types';

/**
 * Payment Calculation Service
 * Generic payment calculation system with tax, admin fees, and gateway fees
 */
export class PaymentCalculationService {
  private feeSettingsAdapter: PaymentCalculationConfig['feeSettingsAdapter'];
  private defaultTaxPercentage: number;
  private defaultAdminFeePercentage: number;
  private currency: string;
  private locale: string;
  private logLevel: 'none' | 'error' | 'warn' | 'info' | 'debug';

  constructor(config: PaymentCalculationConfig) {
    this.feeSettingsAdapter = config.feeSettingsAdapter;
    this.defaultTaxPercentage = config.options?.defaultTaxPercentage ?? 0;
    this.defaultAdminFeePercentage = config.options?.defaultAdminFeePercentage ?? 11;
    this.currency = config.options?.currency ?? 'IDR';
    this.locale = config.options?.locale ?? 'id-ID';
    this.logLevel = config.options?.logLevel ?? 'info';
  }

  /**
   * Get fee settings for an entity (property, organization, etc.)
   */
  async getFeeSettings(entityId: string): Promise<FeeSettings> {
    try {
      return await this.feeSettingsAdapter.getFeeSettings(entityId);
    } catch (error) {
      this.log('error', 'Error getting fee settings:', error);
      // Return defaults
      return {
        taxPercentage: this.defaultTaxPercentage,
        adminFeePercentage: this.defaultAdminFeePercentage,
        paymentGatewayFee: {
          paidByUser: true,
          percentage: 0,
          fixedAmount: 0,
          enabled: false
        },
        platformFee: {
          percentage: this.defaultAdminFeePercentage,
          enabled: this.defaultAdminFeePercentage > 0,
          minimumAmount: 0,
          maximumAmount: 1000000
        },
        tax: {
          type: 'exclude',
          percentage: this.defaultTaxPercentage,
          enabled: this.defaultTaxPercentage > 0
        }
      };
    }
  }

  /**
   * Calculate payment amounts with tax, admin fees, and gateway fees
   */
  async calculatePaymentAmounts(
    entityId: string,
    baseAmount: number,
    options: PaymentCalculationOptions = {}
  ): Promise<PaymentCalculationResult> {
    try {
      const settings = await this.getFeeSettings(entityId);
      const {
        includeTax = true,
        includeAdminFee = true,
        lateFee = 0,
        discountAmount = 0,
        paymentMethod,
        isOnlinePayment
      } = options;

      let subtotal = baseAmount;

      // Apply discount first
      if (discountAmount > 0) {
        subtotal = Math.max(0, subtotal - discountAmount);
      }

      // Calculate tax on base amount (if enabled and > 0%)
      let taxAmount = 0;
      if (includeTax && settings.tax?.enabled && settings.taxPercentage > 0) {
        taxAmount = subtotal * (settings.taxPercentage / 100);
        this.log('debug', `💰 Tax calculation: ${subtotal} × ${settings.taxPercentage}% = ${taxAmount}`);
      } else {
        this.log('debug', `💰 Tax disabled or 0%: ${settings.taxPercentage}%`);
      }

      // Calculate total amount after tax
      const totalAfterTax = subtotal + taxAmount;
      this.log('debug', `💰 Amount after tax: ${subtotal} + ${taxAmount} = ${totalAfterTax}`);

      // Calculate admin fee (Platform Fee) on total amount after tax
      let adminFeeAmount = 0;
      if (includeAdminFee && settings.platformFee?.enabled && settings.adminFeePercentage > 0) {
        adminFeeAmount = totalAfterTax * (settings.adminFeePercentage / 100);
        this.log('debug', `💰 Admin fee calculation: ${totalAfterTax} × ${settings.adminFeePercentage}% = ${adminFeeAmount}`);

        // Apply minimum and maximum limits
        if (settings.platformFee) {
          if (adminFeeAmount < settings.platformFee.minimumAmount) {
            adminFeeAmount = settings.platformFee.minimumAmount;
          }
          if (adminFeeAmount > settings.platformFee.maximumAmount) {
            adminFeeAmount = settings.platformFee.maximumAmount;
          }
        }
      } else {
        this.log('debug', `💰 Admin fee disabled or 0%: ${settings.adminFeePercentage}%`);
      }

      // Calculate payment gateway fee (paid by user, outside admin fee)
      // Only applies to online payments
      let gatewayFeeAmount = 0;
      const isOnline = isOnlinePayment ?? (paymentMethod === 'online');

      if (isOnline && settings.paymentGatewayFee?.enabled && settings.paymentGatewayFee.paidByUser) {
        const totalBeforeGateway = totalAfterTax + adminFeeAmount + lateFee;

        // Calculate gateway fee: percentage of total or fixed amount
        if (settings.paymentGatewayFee.percentage > 0) {
          gatewayFeeAmount = totalBeforeGateway * (settings.paymentGatewayFee.percentage / 100);
        }
        if (settings.paymentGatewayFee.fixedAmount > 0) {
          gatewayFeeAmount = Math.max(gatewayFeeAmount, settings.paymentGatewayFee.fixedAmount);
        }

        this.log('debug', `💳 Gateway fee calculation: ${totalBeforeGateway} × ${settings.paymentGatewayFee.percentage}% + ${settings.paymentGatewayFee.fixedAmount} = ${gatewayFeeAmount}`);
      } else {
        this.log('debug', `💳 Gateway fee not applicable (online: ${isOnline}, enabled: ${settings.paymentGatewayFee?.enabled}, paidByUser: ${settings.paymentGatewayFee?.paidByUser})`);
      }

      // Calculate final total
      const totalAmount = totalAfterTax + adminFeeAmount + lateFee + gatewayFeeAmount;
      this.log('info', `💰 Final calculation: ${totalAfterTax} + ${adminFeeAmount} + ${lateFee} + ${gatewayFeeAmount} = ${totalAmount}`);
      this.log('debug', `💰 Breakdown: Base=${subtotal}, Tax=${taxAmount}, AdminFee=${adminFeeAmount}, LateFee=${lateFee}, GatewayFee=${gatewayFeeAmount}, Total=${totalAmount}`);

      return {
        baseAmount,
        subtotal,
        taxAmount: Math.round(taxAmount),
        taxPercentage: settings.taxPercentage,
        taxType: settings.tax?.type || 'exclude',
        totalAfterTax: Math.round(totalAfterTax),
        adminFeeAmount: Math.round(adminFeeAmount),
        adminFeePercentage: settings.adminFeePercentage,
        lateFee,
        gatewayFeeAmount: Math.round(gatewayFeeAmount),
        gatewayFeePercentage: settings.paymentGatewayFee?.percentage || 0,
        gatewayFeeFixedAmount: settings.paymentGatewayFee?.fixedAmount || 0,
        gatewayFeePaidByUser: settings.paymentGatewayFee?.paidByUser ?? true,
        discountAmount,
        totalAmount: Math.round(totalAmount),
        breakdown: {
          base: subtotal,
          tax: Math.round(taxAmount),
          totalAfterTax: Math.round(totalAfterTax),
          adminFee: Math.round(adminFeeAmount),
          lateFee,
          gatewayFee: Math.round(gatewayFeeAmount),
          total: Math.round(totalAmount)
        },
        calculation: {
          baseAmount: subtotal,
          taxPercentage: settings.taxPercentage,
          taxAmount: Math.round(taxAmount),
          adminFeePercentage: settings.adminFeePercentage,
          adminFeeAmount: Math.round(adminFeeAmount),
          gatewayFeeAmount: Math.round(gatewayFeeAmount),
          totalAmount: Math.round(totalAmount)
        }
      };
    } catch (error) {
      this.log('error', 'Error calculating payment amounts:', error);
      throw error;
    }
  }

  /**
   * Format currency for display
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat(this.locale, {
      style: 'currency',
      currency: this.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  /**
   * Check if fees should be displayed
   */
  shouldShowFees(taxPercentage: number, adminFeePercentage: number): {
    showTax: boolean;
    showAdminFee: boolean;
  } {
    return {
      showTax: taxPercentage > 0,
      showAdminFee: adminFeePercentage > 0
    };
  }

  /**
   * Internal logging method
   */
  private log(level: 'error' | 'warn' | 'info' | 'debug', ...args: any[]): void {
    const levels: Record<string, number> = {
      none: 0,
      error: 1,
      warn: 2,
      info: 3,
      debug: 4
    };

    const currentLevel = levels[this.logLevel] || 0;
    const messageLevel = levels[level] || 0;

    if (messageLevel <= currentLevel) {
      if (level === 'error') {
        console.error(...args);
      } else if (level === 'warn') {
        console.warn(...args);
      } else if (level === 'info') {
        console.log(...args);
      } else if (level === 'debug') {
        console.debug(...args);
      }
    }
  }
}
