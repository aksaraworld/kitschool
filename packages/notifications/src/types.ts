/**
 * Copyright (c) 2025 Panji Tianda (panjitianda@gmail.com) - In behalf of Aksara Nirwana Tianda. All rights reserved.
 */

/**
 * Notification priority levels
 */
export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

/**
 * Notification data structure
 */
export interface NotificationData {
  title: string;
  message: string;
  type: string;
  priority?: NotificationPriority;
  recipientId?: string;
  recipientRole?: string;
  propertyId?: string;
  actionData?: {
    entityType: string;
    entityId: string;
    actionUrl: string;
  };
  metadata?: Record<string, any>;
  sendEmail?: boolean;
  emailData?: {
    to: string;
    subject?: string;
    template?: string;
    data?: Record<string, any>;
    html?: string;
  };
}

/**
 * Resident information structure
 */
export interface ResidentInfo {
  userId: string;
  residentId: string;
  block?: string;
  [key: string]: any;
}

/**
 * Notification service interface
 */
export interface NotificationService {
  addNotification(notification: NotificationData): Promise<any>;
}

/**
 * Email service interface
 */
export interface EmailService {
  sendEmail(data: {
    to: string;
    subject: string;
    html?: string;
    template?: string;
    data?: Record<string, any>;
  }): Promise<void>;
}

/**
 * Database adapter interface for recipient resolution
 */
export interface DatabaseAdapter {
  collection(name: string): CollectionReference;
}

export interface CollectionReference {
  doc(id: string): DocumentReference;
  where(field: string, operator: string, value: any): Query;
  get(): Promise<QuerySnapshot>;
}

export interface DocumentReference {
  get(): Promise<DocumentSnapshot>;
  data(): any;
  exists: boolean;
}

export interface Query {
  where(field: string, operator: string, value: any): Query;
  get(): Promise<QuerySnapshot>;
}

export interface QuerySnapshot {
  docs: DocumentSnapshot[];
  empty: boolean;
}

export interface DocumentSnapshot {
  id: string;
  data(): any;
  exists: boolean;
}

/**
 * Notification manager configuration
 */
export interface NotificationManagerConfig {
  database: DatabaseAdapter;
  notificationService: NotificationService;
  emailService?: EmailService;
  options?: {
    enableEmail?: boolean;
    enablePush?: boolean;
    logLevel?: 'none' | 'error' | 'warn' | 'info' | 'debug';
  };
}
