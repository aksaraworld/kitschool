# @aksara/formatters

Formatting utilities for currency, dates, and numbers for Aksara Framework.

## Features

- ✅ Currency formatting (IDR, USD, etc.)
- ✅ Date formatting with locale support
- ✅ Firestore Timestamp parsing
- ✅ Month name helpers

## Installation

```bash
npm install @aksara/formatters
```

## Usage

### Currency Formatting

```typescript
import { formatCurrency, formatIDR } from '@aksara/formatters';

// Format as IDR (default)
formatIDR(1000000); // "Rp 1.000.000"

// Custom currency
formatCurrency(1000, {
  locale: 'en-US',
  currency: 'USD'
}); // "$1,000.00"
```

### Date Formatting

```typescript
import { formatDate, formatDateTime, parseDate, getMonthName } from '@aksara/formatters';

// Format date (handles Firestore Timestamps)
formatDate(firestoreTimestamp); // "15 Januari 2025"

// Format date and time
formatDateTime(date); // "15 Januari 2025, 14:30"

// Parse various date formats
const date = parseDate('2025-01-15');
const date2 = parseDate(firestoreTimestamp);

// Get month name
getMonthName(1); // "Januari"
```

## License

Proprietary - Copyright (c) 2025 Panji Tianda (panjitianda@gmail.com) - In behalf of Aksara Nirwana Tianda. All rights reserved.
