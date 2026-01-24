# @aksara/notifications

Notification system for Aksara Framework with multi-channel support (in-app, email, push).

## Features

- ✅ Multi-channel notifications (in-app, email, push)
- ✅ Role-based recipient resolution
- ✅ Property-scoped notifications
- ✅ Batch notification sending
- ✅ Configurable notification rules
- ✅ Enhanced error handling and logging

## Installation

```bash
npm install @aksara/notifications
```

## Usage

### Basic Setup

```typescript
import { NotificationManager } from '@aksara/notifications';
import { DatabaseAdapter, NotificationService, EmailService } from '@aksara/notifications';

// Configure notification manager
const notificationManager = new NotificationManager({
  database: yourDatabaseAdapter,
  notificationService: yourNotificationService,
  emailService: yourEmailService, // Optional
  options: {
    enableEmail: true,
    enablePush: true,
    logLevel: 'info'
  }
});
```

### Notify Announcement Created

```typescript
await notificationManager.notifyAnnouncementCreated({
  announcementId: 'ann-123',
  propertyId: 'prop-456',
  title: 'New Announcement',
  content: 'This is the announcement content...',
  createdBy: 'user-789',
  createdByRole: 'management',
  targetRoles: ['resident', 'staff', 'management'], // Optional
  targetBlocks: ['Block A', 'Block B'] // Optional, for supervisor targeting
});
```

### Notify Financial Report Published

```typescript
await notificationManager.notifyFinancialReportPublished({
  reportId: 'report-123',
  propertyId: 'prop-456',
  month: 1,
  year: 2025
});
```

### Notify Payment Confirmed

```typescript
await notificationManager.notifyPaymentConfirmed({
  paymentId: 'pay-123',
  propertyId: 'prop-456',
  amount: 100000,
  type: 'ipl'
});
```

### Custom Notifications

```typescript
await notificationManager.sendCustomNotification({
  title: 'Custom Notification',
  message: 'This is a custom notification',
  type: 'custom',
  priority: 'high',
  recipientId: 'user-123',
  recipientRole: 'resident',
  propertyId: 'prop-456',
  actionData: {
    entityType: 'custom',
    entityId: 'custom-123',
    actionUrl: '/custom/123'
  }
});
```

### Batch Notifications

```typescript
await notificationManager.sendBatchNotifications([
  {
    title: 'Notification 1',
    message: 'Message 1',
    type: 'info',
    recipientId: 'user-1',
    // ...
  },
  {
    title: 'Notification 2',
    message: 'Message 2',
    type: 'info',
    recipientId: 'user-2',
    // ...
  }
]);
```

## Recipient Resolution

The framework provides helper functions for resolving notification recipients:

```typescript
import { getUsersByRole, getResidentsByProperty, getActiveSecurity } from '@aksara/notifications';

// Get users by role
const managerIds = await getUsersByRole(database, 'management', propertyId);

// Get residents by property
const residents = await getResidentsByProperty(database, propertyId, {
  propertyIdField: ['propertyId', 'property'], // Optional: custom field names
  userIdField: ['user', 'userId', 'uid'] // Optional: custom field names
});

// Get active security staff
const securityIds = await getActiveSecurity(database, propertyId);
```

## Configuration

### Database Adapter

You need to provide a database adapter that implements the `DatabaseAdapter` interface:

```typescript
interface DatabaseAdapter {
  collection(name: string): CollectionReference;
}
```

### Notification Service

You need to provide a notification service that implements the `NotificationService` interface:

```typescript
interface NotificationService {
  addNotification(notification: NotificationData): Promise<any>;
}
```

### Email Service (Optional)

You can optionally provide an email service:

```typescript
interface EmailService {
  sendEmail(data: {
    to: string;
    subject: string;
    html?: string;
    template?: string;
    data?: Record<string, any>;
  }): Promise<void>;
}
```

## Types

```typescript
interface NotificationData {
  title: string;
  message: string;
  type: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
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
```

## License

Proprietary - Copyright (c) 2025 Panji Tianda (panjitianda@gmail.com) - In behalf of Aksara Nirwana Tianda. All rights reserved.
