# Sistem Pembayaran Cognifa

## Overview
Sistem pembayaran yang dapat digunakan kembali dengan tracking lengkap untuk semua transaksi pembayaran.

## Komponen Utama

### 1. Invoice (Tagihan)
- Menyimpan semua tagihan untuk orang tua
- Support multiple items dalam satu invoice
- Auto-generate invoice number (INV-YYYY-XXXXXX)
- Status: draft, pending, partial, paid, overdue, cancelled
- Tracking paid amount dan remaining amount

### 2. PaymentAttempt (Percobaan Pembayaran)
- Menyimpan semua percobaan pembayaran
- Tracking status: pending, processing, success, failed, cancelled
- Support multiple payment methods
- Link ke invoice
- Store proof of payment dan transaction details

### 3. Payment Module (Komponen Reusable)
- `PaymentModal`: Modal untuk melakukan pembayaran
- `InvoiceCard`: Card untuk menampilkan invoice
- Dapat dipanggil dari berbagai halaman

## Penggunaan

### Dari Halaman Invoice
```tsx
import InvoiceCard from '@/components/Payment/InvoiceCard';

<InvoiceCard 
  invoice={invoice} 
  onPaymentSuccess={fetchInvoices}
  showPaymentButton={true}
/>
```

### Dari Halaman Lain
```tsx
import PaymentModal from '@/components/Payment/PaymentModal';

<PaymentModal
  invoice={invoice}
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  onSuccess={handleSuccess}
/>
```

## API Endpoints

### Invoices
- `GET /api/invoices` - Get all invoices
- `GET /api/invoices/:id` - Get invoice by ID (with payment attempts)
- `POST /api/invoices` - Create invoice (Finance/Staff/Principal only)
- `PUT /api/invoices/:id` - Update invoice (Finance/Staff/Principal only)

### Payment Attempts
- `POST /api/invoices/:id/payment-attempts` - Create payment attempt (Parents)
- `PUT /api/invoices/payment-attempts/:id` - Update payment attempt status (Finance/Staff/Principal)
- `GET /api/invoices/payment-attempts/all` - Get all payment attempts (Finance/Staff/Principal)

## Flow Pembayaran

1. **Staff/Finance membuat Invoice**
   - Input student, parent, amount, due date
   - Add items (optional)
   - Invoice status: pending

2. **Parent melihat Invoice**
   - Parent login dan melihat daftar invoice
   - Dapat filter berdasarkan status, bulan, tahun

3. **Parent membuat Payment Attempt**
   - Klik "Bayar Sekarang" pada invoice
   - Input amount, payment method, transaction details
   - Upload proof of payment (URL)
   - Status: pending

4. **Finance/Staff memproses Payment**
   - Lihat semua payment attempts dengan status pending
   - Verifikasi proof of payment
   - Update status menjadi success atau failed
   - Jika success, invoice paidAmount dan status diupdate otomatis

5. **Tracking**
   - Semua payment attempts tersimpan untuk tracking
   - Invoice status update otomatis berdasarkan paidAmount
   - History lengkap semua transaksi

## Payment Methods

- Bank Transfer (Transfer Bank)
- Credit Card (Kartu Kredit)
- Debit Card (Kartu Debit)
- E-Wallet
- Cash (Tunai)
- Other (Lainnya)

## Status Invoice

- **draft**: Draft, belum dikirim
- **pending**: Menunggu pembayaran
- **partial**: Sebagian sudah dibayar
- **paid**: Lunas
- **overdue**: Terlambat
- **cancelled**: Dibatalkan

## Status Payment Attempt

- **pending**: Menunggu verifikasi
- **processing**: Sedang diproses
- **success**: Berhasil
- **failed**: Gagal
- **cancelled**: Dibatalkan

## Fitur

1. **Reusable Component**: Payment module dapat digunakan dari berbagai halaman
2. **Full Tracking**: Semua payment attempts tersimpan
3. **Multiple Payment Methods**: Support berbagai metode pembayaran
4. **Proof of Payment**: Upload bukti pembayaran
5. **Auto Status Update**: Invoice status update otomatis
6. **History**: Riwayat lengkap semua transaksi

## Database Schema

### Invoice
- invoiceNumber (unique, auto-generated)
- studentId
- parentId
- amount
- paidAmount
- remainingAmount
- status
- items[]
- dueDate
- createdBy

### PaymentAttempt
- invoiceId
- studentId
- parentId
- amount
- paymentMethod
- status
- transactionId
- proofOfPayment
- receiptUrl
- notes
- errorMessage
- processedAt

## Security

- Parents hanya bisa melihat invoice mereka sendiri
- Parents hanya bisa membuat payment attempt untuk invoice mereka
- Finance/Staff/Principal dapat melihat dan memproses semua payment
- Semua endpoints protected dengan authentication

## Future Enhancements

- Integration dengan payment gateway (Midtrans, Xendit, dll)
- Auto-verification untuk payment tertentu
- Email notification untuk invoice dan payment status
- PDF invoice generation
- Payment reminders
- Recurring invoices
- Payment plans

