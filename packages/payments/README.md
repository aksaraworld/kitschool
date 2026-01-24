# @aksara/payments

Payment calculation system for Aksara Framework with tax, admin fees, and payment gateway fees.

## Features

- ✅ Tax calculation (configurable percentage)
- ✅ Admin fee calculation (platform fee)
- ✅ Payment gateway fee calculation (percentage or fixed)
- ✅ Late fee support
- ✅ Discount support
- ✅ Online/offline payment detection
- ✅ Currency formatting
- ✅ Configurable fee settings per entity

## Installation

```bash
npm install @aksara/payments
```

## Usage

### Basic Setup

```typescript
import { PaymentCalculationService } from '@aksara/payments';
import { FeeSettingsAdapter } from '@aksara/payments';

// Create fee settings adapter
class MyFeeSettingsAdapter implements FeeSettingsAdapter {
  async getFeeSettings(entityId: string): Promise<FeeSettings> {
    // Fetch fee settings from your database
    // Return fee settings structure
    return {
      taxPercentage: 0,
      adminFeePercentage: 11,
      paymentGatewayFee: {
        paidByUser: true,
        percentage: 2.5,
        fixedAmount: 0,
        enabled: true
      },
      platformFee: {
        percentage: 11,
        enabled: true,
        minimumAmount: 0,
        maximumAmount: 1000000
      },
      tax: {
        type: 'exclude',
        percentage: 0,
        enabled: false
      }
    };
  }
}

// Initialize payment calculation service
const paymentService = new PaymentCalculationService({
  feeSettingsAdapter: new MyFeeSettingsAdapter(),
  options: {
    defaultTaxPercentage: 0,
    defaultAdminFeePercentage: 11,
    currency: 'IDR',
    locale: 'id-ID',
    logLevel: 'info'
  }
});
```

### Calculate Payment Amounts

```typescript
// Calculate payment with all fees
const result = await paymentService.calculatePaymentAmounts(
  'property-123', // Entity ID
  1000000,        // Base amount
  {
    includeTax: true,
    includeAdminFee: true,
    lateFee: 0,
    discountAmount: 0,
    paymentMethod: 'online', // or 'offline', 'manual'
    isOnlinePayment: true
  }
);

console.log(result);
// {
//   baseAmount: 1000000,
//   subtotal: 1000000,
//   taxAmount: 0,
//   totalAfterTax: 1000000,
//   adminFeeAmount: 110000,
//   gatewayFeeAmount: 27750, // 2.5% of (1000000 + 110000)
//   totalAmount: 1137750,
//   breakdown: { ... },
//   calculation: { ... }
// }
```

### Format Currency

```typescript
const formatted = paymentService.formatCurrency(1137750);
// "Rp 1.137.750"
```

### Check Fee Visibility

```typescript
const { showTax, showAdminFee } = paymentService.shouldShowFees(0, 11);
// { showTax: false, showAdminFee: true }
```

## Fee Calculation Logic

### Calculation Order

1. **Base Amount** - Starting amount
2. **Discount** - Applied first (if any)
3. **Subtotal** - Base amount - discount
4. **Tax** - Calculated on subtotal (if enabled)
5. **Total After Tax** - Subtotal + tax
6. **Admin Fee** - Calculated on total after tax (if enabled)
7. **Late Fee** - Added if payment is overdue
8. **Gateway Fee** - Calculated on (total after tax + admin fee + late fee) for online payments
9. **Total Amount** - Final amount to pay

### Gateway Fee

Gateway fees are only applied when:
- Payment method is `'online'` or `isOnlinePayment: true`
- Gateway fee is enabled in settings
- `paidByUser` is `true`

Gateway fee calculation:
- If percentage > 0: `(total before gateway) × percentage`
- If fixed amount > 0: `max(percentage fee, fixed amount)`

## Types

```typescript
interface FeeSettings {
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

interface PaymentCalculationResult {
  baseAmount: number;
  subtotal: number;
  taxAmount: number;
  totalAfterTax: number;
  adminFeeAmount: number;
  gatewayFeeAmount: number;
  lateFee: number;
  totalAmount: number;
  breakdown: { ... };
  calculation: { ... };
}
```

## License

Proprietary - Copyright (c) 2025 Panji Tianda (panjitianda@gmail.com) - In behalf of Aksara Nirwana Tianda. All rights reserved.
