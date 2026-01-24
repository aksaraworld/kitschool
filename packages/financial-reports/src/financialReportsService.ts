/**
 * Copyright (c) 2025 Panji Tianda (panjitianda@gmail.com) - In behalf of Aksara Nirwana Tianda. All rights reserved.
 */

import {
  FinancialReport,
  FinancialTransaction,
  TransactionVisibility,
  ReportStatus,
  ReportSettings,
  FinancialReportsConfig,
  TransactionAggregator
} from './types';

/**
 * Financial Reports Service
 * Generic financial reporting system with per-item visibility and auto-publish
 */
export class FinancialReportsService {
  private database: FinancialReportsConfig['database'];
  private transactionAggregator: TransactionAggregator;
  private notificationService?: FinancialReportsConfig['notificationService'];
  private defaultAutoPublishDay: number;
  private logLevel: 'none' | 'error' | 'warn' | 'info' | 'debug';

  constructor(config: FinancialReportsConfig) {
    this.database = config.database;
    this.transactionAggregator = config.transactionAggregator;
    this.notificationService = config.notificationService;
    this.defaultAutoPublishDay = config.options?.defaultAutoPublishDay ?? 1;
    this.logLevel = config.options?.logLevel ?? 'info';
  }

  /**
   * Create or update a financial report for a specific month
   */
  async createReport(
    entityId: string,
    month: number,
    year: number,
    transactionVisibility: TransactionVisibility = {}
  ): Promise<FinancialReport> {
    try {
      // Get date range for the month
      const startOfMonth = new Date(year, month - 1, 1);
      const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

      // Get all transactions for the month
      const allTransactions = await this.transactionAggregator.getTransactions(
        entityId,
        startOfMonth,
        endOfMonth
      );

      // Filter visible transactions based on visibility map
      // Default: if not in map, assume visible (true)
      const visibleTransactions = allTransactions.filter(t => {
        return transactionVisibility[t.id] !== false;
      });

      // Calculate totals from visible transactions only
      const totalIncome = visibleTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + (t.amount || 0), 0);

      const totalExpense = visibleTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + (t.amount || 0), 0);

      // Store transaction details with visibility
      const transactionDetails = allTransactions.map(t => ({
        ...t,
        isVisible: transactionVisibility[t.id] !== false
      }));

      // Check if report already exists
      const existingReport = await this.database.getReport(entityId, month, year);

      const reportData: FinancialReport = {
        id: existingReport?.id,
        entityId,
        month,
        year,
        totalIncome,
        totalExpense,
        netAmount: totalIncome - totalExpense,
        transactionDetails,
        transactionVisibility,
        isPublished: false,
        createdAt: existingReport?.createdAt || new Date(),
        updatedAt: new Date()
      };

      let reportId: string;
      if (existingReport?.id) {
        await this.database.updateReport(existingReport.id, reportData);
        reportId = existingReport.id;
      } else {
        reportId = await this.database.saveReport(reportData);
      }

      this.log('info', `✅ Created/updated financial report for ${entityId} - ${month}/${year}`);

      return {
        ...reportData,
        id: reportId
      };
    } catch (error) {
      this.log('error', 'Error creating financial report:', error);
      throw error;
    }
  }

  /**
   * Publish a financial report
   */
  async publishReport(
    entityId: string,
    month: number,
    year: number,
    transactionVisibility: TransactionVisibility = {},
    publishedBy: string
  ): Promise<FinancialReport> {
    try {
      // Create or update report
      const report = await this.createReport(entityId, month, year, transactionVisibility);

      // Update report as published
      const publishedReport: FinancialReport = {
        ...report,
        isPublished: true,
        publishedAt: new Date(),
        publishedBy,
        updatedAt: new Date()
      };

      if (report.id) {
        await this.database.updateReport(report.id, publishedReport);
      } else {
        const reportId = await this.database.saveReport(publishedReport);
        publishedReport.id = reportId;
      }

      // Notify about published report (if notification service is configured)
      if (this.notificationService?.notifyReportPublished && publishedReport.id) {
        try {
          await this.notificationService.notifyReportPublished({
            reportId: publishedReport.id,
            entityId,
            month,
            year
          });
        } catch (notificationError) {
          this.log('warn', 'Failed to send financial report notifications:', notificationError);
          // Don't fail the publish if notifications fail
        }
      }

      this.log('info', `✅ Published financial report for ${entityId} - ${month}/${year}`);

      return publishedReport;
    } catch (error) {
      this.log('error', 'Error publishing financial report:', error);
      throw error;
    }
  }

  /**
   * Get published reports
   */
  async getPublishedReports(
    entityId: string,
    options?: {
      month?: number;
      year?: number;
      limit?: number;
    }
  ): Promise<FinancialReport[]> {
    try {
      const reports = await this.database.getPublishedReports(entityId, options);

      // Filter transaction details to only show visible ones
      return reports.map(report => ({
        ...report,
        transactionDetails: (report.transactionDetails || []).filter(
          t => t.isVisible !== false
        )
      }));
    } catch (error) {
      this.log('error', 'Error fetching published reports:', error);
      throw error;
    }
  }

  /**
   * Get report status (published/unpublished)
   */
  async getReportStatus(
    entityId: string,
    month: number,
    year: number
  ): Promise<ReportStatus> {
    try {
      const report = await this.database.getReport(entityId, month, year);

      if (!report) {
        return {
          isPublished: false,
          publishedAt: null
        };
      }

      return {
        isPublished: report.isPublished || false,
        publishedAt: report.publishedAt
          ? (typeof report.publishedAt === 'string'
              ? report.publishedAt
              : report.publishedAt.toISOString())
          : null,
        publishedBy: report.publishedBy
      };
    } catch (error) {
      this.log('error', 'Error getting report status:', error);
      throw error;
    }
  }

  /**
   * Get report settings
   */
  async getReportSettings(entityId: string): Promise<ReportSettings> {
    try {
      return await this.database.getReportSettings(entityId);
    } catch (error) {
      this.log('error', 'Error getting report settings:', error);
      return {
        autoPublishEnabled: false,
        autoPublishDay: this.defaultAutoPublishDay
      };
    }
  }

  /**
   * Update report settings
   */
  async updateReportSettings(
    entityId: string,
    settings: Partial<ReportSettings>
  ): Promise<ReportSettings> {
    try {
      await this.database.updateReportSettings(entityId, settings);
      return await this.getReportSettings(entityId);
    } catch (error) {
      this.log('error', 'Error updating report settings:', error);
      throw error;
    }
  }

  /**
   * Auto-publish reports for entities with auto-publish enabled
   * This should be called by a cron job on the 1st day of each month
   */
  async autoPublishReports(
    entityIds: string[],
    month: number,
    year: number
  ): Promise<Array<{ entityId: string; success: boolean; reportId?: string; error?: string }>> {
    const results: Array<{ entityId: string; success: boolean; reportId?: string; error?: string }> = [];

    for (const entityId of entityIds) {
      try {
        const settings = await this.getReportSettings(entityId);

        if (!settings.autoPublishEnabled) {
          this.log('debug', `⏭️ Auto-publish disabled for ${entityId}`);
          continue;
        }

        // Check if report already exists and is published
        const existingReport = await this.database.getReport(entityId, month, year);
        if (existingReport?.isPublished) {
          this.log('debug', `⏭️ Report already published for ${entityId} - ${month}/${year}`);
          results.push({
            entityId,
            success: true,
            reportId: existingReport.id
          });
          continue;
        }

        // Create report with all transactions visible by default
        const allTransactions = await this.transactionAggregator.getTransactions(
          entityId,
          new Date(year, month - 1, 1),
          new Date(year, month, 0, 23, 59, 59, 999)
        );

        // All transactions visible by default in auto-publish
        const transactionVisibility: TransactionVisibility = {};
        allTransactions.forEach(t => {
          transactionVisibility[t.id] = true;
        });

        // Publish report
        const report = await this.publishReport(
          entityId,
          month,
          year,
          transactionVisibility,
          'system'
        );

        results.push({
          entityId,
          success: true,
          reportId: report.id
        });

        this.log('info', `✅ Auto-published report for ${entityId} - ${month}/${year}`);
      } catch (error: any) {
        this.log('error', `❌ Error auto-publishing report for ${entityId}:`, error);
        results.push({
          entityId,
          success: false,
          error: error.message || 'Unknown error'
        });
      }
    }

    return results;
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
