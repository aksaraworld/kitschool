/**
 * Copyright (c) 2025 Panji Tianda (panjitianda@gmail.com) - In behalf of Aksara Nirwana Tianda. All rights reserved.
 */

/**
 * Transaction type
 */
export type TransactionType = 'income' | 'expense';

/**
 * Transaction source
 */
export type TransactionSource = 'manual' | 'integrated';

/**
 * Financial transaction
 */
export interface FinancialTransaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  category?: string;
  date: string | Date;
  source: TransactionSource;
  isVisible?: boolean;
  metadata?: Record<string, any>;
}

/**
 * Transaction visibility map
 */
export type TransactionVisibility = Record<string, boolean>;

/**
 * Financial report
 */
export interface FinancialReport {
  id?: string;
  entityId: string; // Property ID, organization ID, etc.
  month: number;
  year: number;
  totalIncome: number;
  totalExpense: number;
  netAmount: number;
  transactionDetails: FinancialTransaction[];
  transactionVisibility: TransactionVisibility;
  isPublished: boolean;
  publishedAt?: string | Date;
  publishedBy?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

/**
 * Report status
 */
export interface ReportStatus {
  isPublished: boolean;
  publishedAt: string | null;
  publishedBy?: string;
}

/**
 * Report settings
 */
export interface ReportSettings {
  autoPublishEnabled: boolean;
  autoPublishDay?: number; // Day of month to auto-publish (default: 1)
}

/**
 * Transaction aggregator interface
 * Implement this to fetch transactions from different sources
 */
export interface TransactionAggregator {
  getTransactions(
    entityId: string,
    startDate: Date,
    endDate: Date
  ): Promise<FinancialTransaction[]>;
}

/**
 * Database adapter interface
 */
export interface FinancialReportsDatabaseAdapter {
  getReport(
    entityId: string,
    month: number,
    year: number
  ): Promise<FinancialReport | null>;
  
  saveReport(report: FinancialReport): Promise<string>;
  
  updateReport(reportId: string, updates: Partial<FinancialReport>): Promise<void>;
  
  getPublishedReports(
    entityId: string,
    options?: {
      month?: number;
      year?: number;
      limit?: number;
    }
  ): Promise<FinancialReport[]>;
  
  getReportSettings(entityId: string): Promise<ReportSettings>;
  
  updateReportSettings(entityId: string, settings: Partial<ReportSettings>): Promise<void>;
}

/**
 * Notification service interface (optional)
 */
export interface FinancialReportNotificationService {
  notifyReportPublished?(data: {
    reportId: string;
    entityId: string;
    month: number;
    year: number;
  }): Promise<void>;
}

/**
 * Financial reports service configuration
 */
export interface FinancialReportsConfig {
  database: FinancialReportsDatabaseAdapter;
  transactionAggregator: TransactionAggregator;
  notificationService?: FinancialReportNotificationService;
  options?: {
    defaultAutoPublishDay?: number;
    logLevel?: 'none' | 'error' | 'warn' | 'info' | 'debug';
  };
}
