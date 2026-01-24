/**
 * Copyright (c) 2025 Panji Tianda (panjitianda@gmail.com) - In behalf of Aksara Nirwana Tianda. All rights reserved.
 */

import {
  NotificationData,
  NotificationManagerConfig,
  NotificationService,
  EmailService,
  DatabaseAdapter
} from './types';
import {
  getUsersByRole,
  getResidentsByProperty,
  getActiveSecurity,
  getResidentUserId
} from './recipientResolver';

/**
 * Send notification to multiple recipients
 */
async function sendNotifications(
  notifications: NotificationData[],
  notificationService: NotificationService,
  emailService?: EmailService,
  enableEmail: boolean = false
): Promise<void> {
  if (notifications.length === 0) {
    console.warn('⚠️ No notifications to send');
    return;
  }
  
  console.log(`📤 Sending ${notifications.length} notifications...`);
  
  const promises = notifications.map(async (notif, index) => {
    try {
      // Send in-app notification
      const result = await notificationService.addNotification(notif);
      console.log(`✅ Notification ${index + 1}/${notifications.length} sent to ${notif.recipientId} (${notif.recipientRole})`);
      
      // Send email if enabled and configured
      if (enableEmail && emailService && notif.sendEmail && notif.emailData) {
        try {
          await emailService.sendEmail({
            to: notif.emailData.to,
            subject: notif.emailData.subject || notif.title,
            html: notif.emailData.html,
            template: notif.emailData.template,
            data: notif.emailData.data
          });
          console.log(`📧 Email sent to ${notif.emailData.to}`);
        } catch (emailError) {
          console.error(`❌ Error sending email to ${notif.emailData.to}:`, emailError);
        }
      }
      
      return result;
    } catch (error) {
      console.error(`❌ Error sending notification ${index + 1}/${notifications.length} to ${notif.recipientId}:`, error);
      throw error;
    }
  });
  
  await Promise.allSettled(promises);
  console.log(`✅ Completed sending ${notifications.length} notifications`);
}

/**
 * Notification Manager
 * Generic notification system for multi-tenant SaaS applications
 */
export class NotificationManager {
  private database: DatabaseAdapter;
  private notificationService: NotificationService;
  private emailService?: EmailService;
  private enableEmail: boolean;
  private logLevel: 'none' | 'error' | 'warn' | 'info' | 'debug';

  constructor(config: NotificationManagerConfig) {
    this.database = config.database;
    this.notificationService = config.notificationService;
    this.emailService = config.emailService;
    this.enableEmail = config.options?.enableEmail ?? false;
    this.logLevel = config.options?.logLevel ?? 'info';
  }

  /**
   * Notify announcement created
   * Notifies all users (residents and staff) based on target roles
   */
  async notifyAnnouncementCreated(data: {
    announcementId: string;
    propertyId: string;
    title: string;
    content: string;
    createdBy: string;
    createdByRole: string;
    targetBlocks?: string[];
    targetRoles?: string[];
  }): Promise<void> {
    try {
      // Default to ALL users - ensure residents are always included
      const targetRoles = data.targetRoles || ['resident', 'staff', 'management', 'supervisor', 'security'];
      
      // Ensure resident is always in target roles for announcements
      if (!targetRoles.includes('resident')) {
        targetRoles.push('resident');
      }
      
      const notifications: NotificationData[] = [];
      
      // For each target role, get users and create notifications
      for (const role of targetRoles) {
        if (role === 'resident') {
          // Get ALL residents for the property
          const residents = await getResidentsByProperty(this.database, data.propertyId);
          
          for (const resident of residents) {
            // Check if supervisor and has specific area/block targeting
            if (data.createdByRole === 'supervisor' && data.targetBlocks && data.targetBlocks.length > 0) {
              // Only notify if resident's block is in target blocks
              if (!data.targetBlocks.includes(resident.block || '')) {
                continue;
              }
            }
            
            notifications.push({
              title: `Pengumuman: ${data.title}`,
              message: data.content.replace(/<[^>]*>/g, '').substring(0, 100) + '...',
              type: 'announcement',
              priority: 'medium',
              recipientId: resident.userId,
              recipientRole: 'resident',
              propertyId: data.propertyId,
              actionData: {
                entityType: 'announcement',
                entityId: data.announcementId,
                actionUrl: `/announcements/${data.announcementId}`
              },
              metadata: {
                announcementId: data.announcementId,
                title: data.title
              }
            });
          }
        } else {
          // Get users by role (management, staff, supervisor, security)
          const userIds = await getUsersByRole(this.database, role, data.propertyId);
          
          for (const userId of userIds) {
            notifications.push({
              title: `Pengumuman: ${data.title}`,
              message: data.content.replace(/<[^>]*>/g, '').substring(0, 100) + '...',
              type: 'announcement',
              priority: 'medium',
              recipientId: userId,
              recipientRole: role,
              propertyId: data.propertyId,
              actionData: {
                entityType: 'announcement',
                entityId: data.announcementId,
                actionUrl: `/announcements/${data.announcementId}`
              },
              metadata: {
                announcementId: data.announcementId,
                title: data.title
              }
            });
          }
        }
      }
      
      this.log('info', `📢 Creating ${notifications.length} notifications for announcement ${data.announcementId}`);
      this.log('info', `   - Target roles: ${targetRoles.join(', ')}`);
      this.log('info', `   - Property ID: ${data.propertyId}`);
      this.log('info', `   - Residents: ${notifications.filter(n => n.recipientRole === 'resident').length}`);
      this.log('info', `   - Staff/Management: ${notifications.filter(n => n.recipientRole !== 'resident').length}`);
      
      if (notifications.length === 0) {
        this.log('warn', '⚠️ No notifications to send - check if users exist for this property');
      }
      
      await sendNotifications(notifications, this.notificationService, this.emailService, this.enableEmail);
    } catch (error) {
      this.log('error', 'Error notifying announcement created:', error);
    }
  }

  /**
   * Notify financial report published
   * Notifies all residents when a financial report is published
   */
  async notifyFinancialReportPublished(data: {
    reportId: string;
    propertyId: string;
    month: number;
    year: number;
  }): Promise<void> {
    try {
      const residents = await getResidentsByProperty(this.database, data.propertyId);
      const notifications: NotificationData[] = residents.map(resident => ({
        title: 'Laporan Keuangan Baru',
        message: `Laporan keuangan bulan ${data.month}/${data.year} telah dipublikasikan.`,
        type: 'finance_report_published',
        priority: 'medium',
        recipientId: resident.userId,
        recipientRole: 'resident',
        propertyId: data.propertyId,
        actionData: {
          entityType: 'finance_report',
          entityId: data.reportId,
          actionUrl: `/financial-reports?month=${data.month}&year=${data.year}`
        },
        metadata: {
          reportId: data.reportId,
          month: data.month,
          year: data.year
        }
      }));
      
      await sendNotifications(notifications, this.notificationService, this.emailService, this.enableEmail);
    } catch (error) {
      this.log('error', 'Error notifying financial report published:', error);
    }
  }

  /**
   * Notify payment confirmed
   * Notifies management, staff, and supervisor when payment is confirmed
   */
  async notifyPaymentConfirmed(data: {
    paymentId: string;
    propertyId: string;
    amount: number;
    type: string;
  }): Promise<void> {
    try {
      const managerIds = await getUsersByRole(this.database, 'management', data.propertyId);
      const supervisorIds = await getUsersByRole(this.database, 'supervisor', data.propertyId);
      const staffIds = await getUsersByRole(this.database, 'staff', data.propertyId);
      
      const allRecipients = [...managerIds, ...supervisorIds, ...staffIds];
      
      const notifications: NotificationData[] = allRecipients.map(userId => ({
        title: `Pembayaran Diterima`,
        message: `Pembayaran sebesar Rp ${data.amount.toLocaleString('id-ID')} telah dikonfirmasi`,
        type: 'payment_received',
        priority: 'medium',
        recipientId: userId,
        recipientRole: 'management',
        propertyId: data.propertyId,
        actionData: {
          entityType: 'payment',
          entityId: data.paymentId,
          actionUrl: `/payments/${data.paymentId}`
        },
        metadata: {
          paymentId: data.paymentId,
          amount: data.amount,
          type: data.type
        }
      }));
      
      await sendNotifications(notifications, this.notificationService, this.emailService, this.enableEmail);
    } catch (error) {
      this.log('error', 'Error notifying payment confirmed:', error);
    }
  }

  /**
   * Generic method to send custom notifications
   */
  async sendCustomNotification(notification: NotificationData): Promise<void> {
    try {
      await sendNotifications([notification], this.notificationService, this.emailService, this.enableEmail);
    } catch (error) {
      this.log('error', 'Error sending custom notification:', error);
    }
  }

  /**
   * Send multiple notifications at once
   */
  async sendBatchNotifications(notifications: NotificationData[]): Promise<void> {
    try {
      await sendNotifications(notifications, this.notificationService, this.emailService, this.enableEmail);
    } catch (error) {
      this.log('error', 'Error sending batch notifications:', error);
    }
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
