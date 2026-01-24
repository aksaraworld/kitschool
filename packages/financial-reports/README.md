# @aksara/financial-reports

Financial reporting system for Aksara Framework with per-item visibility control and auto-publish scheduling.

## Features

- ✅ Financial report creation and management
- ✅ Per-item visibility control
- ✅ Auto-publish scheduling (cron-ready)
- ✅ Transaction aggregation from multiple sources
- ✅ Report status tracking (published/unpublished)
- ✅ Monthly/yearly report views
- ✅ Integration with notification system

## Installation

```bash
npm install @aksara/financial-reports
```

## Usage

### Basic Setup

```typescript
import { FinancialReportsService } from '@aksara/financial-reports';
import type {
  FinancialReportsDatabaseAdapter,
  TransactionAggregator,
  FinancialReportNotificationService
} from '@aksara/financial-reports';

// Implement database adapter
class MyDatabaseAdapter implements FinancialReportsDatabaseAdapter {
  async getReport(entityId: string, month: number, year: number) {
    // Fetch report from database
  }
  
  async saveReport(report: FinancialReport) {
    // Save report to database
    return 'report-id';
  }
  
  // ... implement other methods
}

// Implement transaction aggregator
class MyTransactionAggregator implements TransactionAggregator {
  async getTransactions(entityId: string, startDate: Date, endDate: Date) {
    // Fetch transactions from various sources
    return [
      {
        id: 'txn-1',
        type: 'income',
        amount: 1000000,
        description: 'Payment',
        date: new Date(),
        source: 'integrated'
      },
      // ... more transactions
    ];
  }
}

// Initialize service
const financialReportsService = new FinancialReportsService({
  database: new MyDatabaseAdapter(),
  transactionAggregator: new MyTransactionAggregator(),
  notificationService: {
    notifyReportPublished: async (data) => {
      // Send notifications when report is published
    }
  },
  options: {
    defaultAutoPublishDay: 1,
    logLevel: 'info'
  }
});
```

### Create Report

```typescript
const report = await financialReportsService.createReport(
  'property-123',
  1, // January
  2025,
  {
    'txn-1': true,  // Visible
    'txn-2': false, // Hidden
    // ... other transactions default to visible
  }
);
```

### Publish Report

```typescript
const publishedReport = await financialReportsService.publishReport(
  'property-123',
  1,
  2025,
  {
    'txn-1': true,
    'txn-2': false
  },
  'user-789' // Published by
);
```

### Get Published Reports

```typescript
// Get all published reports
const reports = await financialReportsService.getPublishedReports('property-123');

// Get specific month
const januaryReport = await financialReportsService.getPublishedReports('property-123', {
  month: 1,
  year: 2025
});
```

### Get Report Status

```typescript
const status = await financialReportsService.getReportStatus('property-123', 1, 2025);
// { isPublished: true, publishedAt: '2025-01-15T...', publishedBy: 'user-789' }
```

### Auto-Publish Reports

```typescript
// Call this from a cron job on the 1st day of each month
const results = await financialReportsService.autoPublishReports(
  ['property-123', 'property-456'], // Entity IDs
  1, // Current month
  2025 // Current year
);

// Results: [{ entityId: 'property-123', success: true, reportId: 'report-123' }, ...]
```

### Report Settings

```typescript
// Get settings
const settings = await financialReportsService.getReportSettings('property-123');

// Update settings
await financialReportsService.updateReportSettings('property-123', {
  autoPublishEnabled: true,
  autoPublishDay: 1
});
```

## Types

```typescript
interface FinancialReport {
  id?: string;
  entityId: string;
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
}

interface FinancialTransaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category?: string;
  date: string | Date;
  source: 'manual' | 'integrated';
  isVisible?: boolean;
}
```

## Cron Job Example

```typescript
// Run on 1st day of each month
async function autoPublishMonthlyReports() {
  const currentDate = new Date();
  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();
  
  // Get all entities that should auto-publish
  const entityIds = await getAllEntitiesWithAutoPublish();
  
  const results = await financialReportsService.autoPublishReports(
    entityIds,
    month,
    year
  );
  
  console.log(`Auto-published ${results.filter(r => r.success).length} reports`);
}
```

## License

Proprietary - Copyright (c) 2025 Panji Tianda (panjitianda@gmail.com) - In behalf of Aksara Nirwana Tianda. All rights reserved.
