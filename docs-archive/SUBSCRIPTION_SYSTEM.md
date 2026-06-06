# Subscription System

## Overview

Aksara School Management menggunakan sistem subscription yang disederhanakan dengan satu plan untuk semua sekolah. Perbedaan hanya pada:
1. **Admin Fee Percentage** - Persentase biaya admin (default: 10%)
2. **Subscription Fee Per Student** - Biaya subscription per murid (default: 0 rupiah)

## Konfigurasi Platform

### Admin Fee Percentage (Default: 10%)

Admin fee dikenakan kepada seluruh transaksi di platform. Admin fee 10% akan dibagi menjadi:
- **3% Payment Gateway** - Biaya payment gateway
- **4% Platform** - Biaya platform
- **3% Tax** - Pajak

### Subscription Fee Per Student (Default: 0)

Biaya subscription per murid dalam rupiah. Dapat di-set per sekolah atau menggunakan default platform.

## Database Schema

### Configuration Model

Menyimpan konfigurasi platform-wide:

```typescript
{
  key: string; // 'admin_fee_percentage', 'subscription_fee_per_student', etc.
  value: any; // 10, 0, etc.
  type: 'number' | 'string' | 'boolean' | 'object';
  updatedBy: ObjectId;
}
```

### School Model

Setiap sekolah memiliki:
- `subscriptionStatus`: trial, active, suspended, cancelled, expired
- `subscriptionFeePerStudent`: override platform default (null = use platform default)

### TransactionFee Model

Menyimpan detail admin fee untuk setiap transaksi:

```typescript
{
  schoolId: ObjectId;
  invoiceId: ObjectId;
  transactionAmount: number; // Total transaksi
  adminFee: number; // Persentase (10%)
  adminFeeAmount: number; // Jumlah admin fee
  feeBreakdown: {
    paymentGateway: number; // 3% dari adminFeeAmount
    platform: number; // 4% dari adminFeeAmount
    tax: number; // 3% dari adminFeeAmount
  };
  netAmount: number; // Jumlah yang diterima sekolah
  status: 'pending' | 'calculated' | 'settled';
}
```

## API Endpoints

### Configuration Management (SaaS Admin Only)

- `GET /api/config` - Get all configurations
- `GET /api/config/:key` - Get specific configuration
- `PUT /api/config/:key` - Update configuration
- `POST /api/config/initialize` - Initialize default configurations
- `GET /api/config/public/admin-fee` - Get admin fee (public)

### Transaction Fees

- `GET /api/transaction-fees` - Get transaction fees
- `GET /api/transaction-fees/invoice/:invoiceId` - Get fee by invoice
- `GET /api/transaction-fees/statistics` - Get statistics (SaaS Admin)
- `PUT /api/transaction-fees/:id/settle` - Mark as settled (SaaS Admin)

## Perhitungan Admin Fee

### Contoh Perhitungan

Transaksi: Rp 1,000,000
Admin Fee: 10% = Rp 100,000

Breakdown:
- Payment Gateway (3% dari 100,000): Rp 3,000
- Platform (4% dari 100,000): Rp 4,000
- Tax (3% dari 100,000): Rp 3,000

Net Amount untuk Sekolah: Rp 900,000

### Flow Perhitungan

1. Payment attempt berhasil
2. Update invoice paidAmount
3. Calculate admin fee berdasarkan cumulative paidAmount
4. Create/Update TransactionFee record
5. Store fee breakdown

## Default Values

```typescript
{
  admin_fee_percentage: 10, // 10%
  subscription_fee_per_student: 0, // 0 rupiah
  payment_gateway_fee_percentage: 3, // 3% of admin fee
  platform_fee_percentage: 4, // 4% of admin fee
  tax_percentage: 3 // 3% of admin fee
}
```

## School-Level Override

Sekolah dapat memiliki `subscriptionFeePerStudent` sendiri:
- `null` = menggunakan platform default
- `number` = menggunakan nilai custom

Hanya SaaS Admin yang dapat mengubah `subscriptionFeePerStudent` per sekolah.

## Admin Fee Breakdown

Admin fee 10% dibagi menjadi:
- **3% Payment Gateway** - Biaya untuk payment gateway provider
- **4% Platform** - Biaya untuk platform Aksara School Management
- **3% Tax** - Pajak yang harus dibayar

Total: 3% + 4% + 3% = 10% dari admin fee amount

## Contoh Penggunaan

### Mengubah Admin Fee Percentage

```bash
PUT /api/config/admin_fee_percentage
{
  "value": 12
}
```

### Mengubah Subscription Fee Per Student (Platform)

```bash
PUT /api/config/subscription_fee_per_student
{
  "value": 5000
}
```

### Mengubah Subscription Fee Per Student (Per Sekolah)

```bash
PUT /api/schools/:id/subscription
{
  "subscriptionFeePerStudent": 10000
}
```

## Statistics

SaaS Admin dapat melihat statistik transaksi fees:
- Total transactions
- Total transaction amount
- Total admin fee
- Total net amount
- Fee breakdown (payment gateway, platform, tax)

## Settlement

Transaction fees dapat di-mark sebagai "settled" setelah dilakukan settlement ke sekolah. Status:
- `calculated` - Fee sudah dihitung
- `settled` - Fee sudah disettlement

