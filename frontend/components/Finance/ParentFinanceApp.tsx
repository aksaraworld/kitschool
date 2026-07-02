'use client';

/**
 * ParentFinanceApp — parent-facing finance dashboard.
 *  - Outstanding invoices (from /api/invoices) with "Bayar Sekarang" → Xendit.
 *  - Historical receipts (from /api/payments/transactions?scope=me) with
 *    "Cetak Bukti" → PrintableReceipt (native print-to-PDF).
 *
 * All calls go through the existing `@aksara/api` adapter (`@/lib/aksara-api`),
 * which attaches the Firebase bearer token + x-school-id automatically.
 */

import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/aksara-api';
import { formatIDR } from '@aksara/formatters';
import { useAuth } from '@/hooks/useAuth';
import { Invoice, InvoiceStatus } from '@/lib/types';
import type { LedgerTransaction } from '@/lib/types/ledger';
import PrintableReceipt, { ReceiptData } from '@/components/Finance/PrintableReceipt';
import {
  Wallet,
  FileText,
  Receipt,
  Loader2,
  CalendarClock,
  CreditCard,
  Printer,
  CheckCircle2,
} from 'lucide-react';

const formatCurrency = (n: number): string => formatIDR(n || 0);

function formatDate(value?: string): string {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

const CATEGORY_LABELS: Record<string, string> = {
  WALLET_REFILL: 'Isi Saldo Dompet',
  TUITION_PAYMENT: 'Pembayaran SPP / Tagihan',
  CANTEEN_ITEM_PURCHASE: 'Pembelian Kantin',
  STORE_ITEM_PURCHASE: 'Pembelian Toko Sekolah',
  CANTEEN_PAYOUT: 'Pencairan Dana',
};

const OUTSTANDING_STATUSES = new Set<string>([
  InvoiceStatus.PENDING,
  InvoiceStatus.PARTIAL,
  InvoiceStatus.OVERDUE,
]);

const ADVANCE_STATUSES = new Set<string>([InvoiceStatus.SCHEDULED]);

export default function ParentFinanceApp() {
  const { user } = useAuth();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [loadingTx, setLoadingTx] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);

  useEffect(() => {
    void loadInvoices();
    void loadTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadInvoices() {
    try {
      setLoadingInvoices(true);
      const data = await api.get<Invoice[]>('/invoices', { skipCache: true });
      setInvoices(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('loadInvoices error:', e);
    } finally {
      setLoadingInvoices(false);
    }
  }

  async function loadTransactions() {
    try {
      setLoadingTx(true);
      const data = await api.get<LedgerTransaction[]>('/payments/transactions', {
        params: { scope: 'me', limit: 100 },
        skipCache: true,
      });
      setTransactions(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('loadTransactions error:', e);
    } finally {
      setLoadingTx(false);
    }
  }

  const outstanding = useMemo(
    () => invoices.filter((inv) => OUTSTANDING_STATUSES.has(String(inv.status))),
    [invoices]
  );

  const advancePayable = useMemo(
    () => invoices.filter((inv) => ADVANCE_STATUSES.has(String(inv.status))),
    [invoices]
  );

  const paidInvoices = useMemo(
    () => invoices.filter((inv) => String(inv.status) === InvoiceStatus.PAID),
    [invoices]
  );

  const totalOutstanding = useMemo(
    () => outstanding.reduce((sum, inv) => sum + (inv.remainingAmount ?? inv.amount ?? 0), 0),
    [outstanding]
  );

  const totalPaidHistory = useMemo(
    () => transactions.reduce((sum, tx) => sum + (tx.amount ?? 0), 0),
    [transactions]
  );

  async function handlePay(invoice: Invoice) {
    setError(null);
    setPayingId(invoice._id);
    try {
      const amount = invoice.remainingAmount ?? invoice.amount ?? 0;
      const res = await api.post<{ invoiceUrl: string; paymentAttemptId: string }>(
        '/payments/invoice/create',
        {
          amount,
          paymentType: 'TUITION',
          metaData: {
            invoiceId: invoice._id,
            referenceId: invoice._id,
            studentId: invoice.studentId,
            description: invoice.description || invoice.invoiceNumber || 'Pembayaran tagihan',
          },
        }
      );
      if (res?.invoiceUrl) {
        // Safe client-side redirect to the Xendit hosted invoice page.
        window.location.assign(res.invoiceUrl);
        return;
      }
      setError('Gagal membuat tautan pembayaran. Coba lagi.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memproses pembayaran');
    } finally {
      setPayingId(null);
    }
  }

  function openInvoiceReceipt(inv: Invoice) {
    setReceipt({
      receiptNumber: inv.invoiceNumber || inv._id,
      dateISO: String(inv.updatedAt ?? inv.createdAt ?? new Date().toISOString()),
      payerName: user?.name,
      studentName: inv.studentName,
      description: inv.description || 'Tagihan Sekolah',
      amount: inv.paidAmount ?? inv.amount ?? 0,
      method: 'Pembayaran Sekolah',
      status: 'LUNAS / PAID',
      invoiceNumber: inv.invoiceNumber,
      transactionId: inv._id,
    });
    setReceiptOpen(true);
  }

  function renderInvoiceCard(inv: Invoice, variant: 'outstanding' | 'advance') {
    const remaining = inv.remainingAmount ?? inv.amount ?? 0;
    const overdue = String(inv.status) === InvoiceStatus.OVERDUE;
    const isAdvance = variant === 'advance';
    return (
      <div
        key={inv._id}
        className={`flex flex-col rounded-xl border bg-white p-5 shadow-sm ${
          overdue ? 'border-red-300' : isAdvance ? 'border-blue-200' : 'border-gray-100'
        }`}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="font-mono text-xs text-gray-400">{inv.invoiceNumber || inv._id}</p>
            <h3 className="mt-1 font-semibold text-gray-900">{inv.description || 'Tagihan Sekolah'}</h3>
            {inv.studentName && <p className="mt-0.5 text-sm text-gray-500">{inv.studentName}</p>}
          </div>
          <span
            className={`rounded-full px-2 py-1 text-xs font-medium ${
              overdue
                ? 'bg-red-100 text-red-700'
                : isAdvance
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-yellow-100 text-yellow-700'
            }`}
          >
            {overdue ? 'Terlambat' : isAdvance ? 'Bayar di Muka' : 'Belum Bayar'}
          </span>
        </div>
        <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
          <CalendarClock className="h-4 w-4" />
          Jatuh tempo: {formatDate(inv.dueDate)}
        </div>
        <div className="mt-3 border-t border-dashed border-gray-100 pt-3">
          <p className="text-xs text-gray-400">Jumlah tagihan</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(remaining)}</p>
        </div>
        <button
          type="button"
          onClick={() => handlePay(inv)}
          disabled={payingId === inv._id}
          className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 font-semibold text-white transition hover:bg-primary-700 disabled:opacity-60"
        >
          {payingId === inv._id ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Memproses...
            </>
          ) : (
            <>
              <CreditCard className="h-4 w-4" /> {isAdvance ? 'Bayar di Muka' : 'Bayar Sekarang'}
            </>
          )}
        </button>
      </div>
    );
  }

  function openReceipt(tx: LedgerTransaction) {
    const invoiceNumber = tx.metaData?.referenceId
      ? invoices.find((inv) => inv._id === tx.metaData?.referenceId)?.invoiceNumber
      : undefined;
    const linkedInvoice = tx.metaData?.referenceId
      ? invoices.find((inv) => inv._id === tx.metaData?.referenceId)
      : undefined;

    setReceipt({
      receiptNumber: (tx.transactionId || '').slice(0, 18).toUpperCase(),
      dateISO: String(tx.timestamp ?? new Date().toISOString()),
      schoolName: undefined,
      payerName: user?.name,
      studentName: linkedInvoice?.studentName,
      description: tx.metaData?.description || CATEGORY_LABELS[tx.category] || 'Pembayaran',
      amount: tx.amount ?? 0,
      method: tx.sourceWalletId === 'EXTERNAL_XENDIT' ? 'Xendit Payment Gateway' : 'Dompet Digital',
      status: 'LUNAS / PAID',
      invoiceNumber: invoiceNumber || undefined,
      transactionId: tx.transactionId,
    });
    setReceiptOpen(true);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Keuangan Saya</h1>
        <p className="mt-2 text-gray-600">Bayar tagihan sekolah dan cetak bukti pembayaran</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Tagihan Belum Lunas</p>
              <p className="mt-2 text-2xl font-bold text-red-600">{formatCurrency(totalOutstanding)}</p>
            </div>
            <FileText className="h-8 w-8 text-red-500" />
          </div>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Jumlah Tagihan Aktif</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{outstanding.length}</p>
            </div>
            <CalendarClock className="h-8 w-8 text-primary-600" />
          </div>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Riwayat Pembayaran</p>
              <p className="mt-2 text-2xl font-bold text-green-600">{formatCurrency(totalPaidHistory)}</p>
            </div>
            <Wallet className="h-8 w-8 text-green-600" />
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Outstanding invoices */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-xl font-semibold text-gray-900">
          <FileText className="h-5 w-5 text-primary-600" />
          Tagihan Belum Dibayar
        </h2>

        {loadingInvoices ? (
          <div className="flex items-center justify-center gap-2 rounded-lg bg-white p-8 text-gray-500 shadow">
            <Loader2 className="h-5 w-5 animate-spin" /> Memuat tagihan...
          </div>
        ) : outstanding.length === 0 ? (
          <div className="rounded-lg bg-white p-8 text-center shadow">
            <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-green-500" />
            <p className="text-gray-500">Semua tagihan sudah lunas. Terima kasih!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {outstanding.map((inv) => renderInvoiceCard(inv, 'outstanding'))}
          </div>
        )}
      </section>

      {/* Advance payment (scheduled future months) */}
      {advancePayable.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-xl font-semibold text-gray-900">
            <CalendarClock className="h-5 w-5 text-blue-600" />
            Bayar di Muka (Bulan Mendatang)
          </h2>
          <p className="text-sm text-gray-500">
            Tagihan periode mendatang — langsung lunas setelah dibayar, tidak muncul sebagai &quot;belum dibayar&quot;.
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {advancePayable.map((inv) => renderInvoiceCard(inv, 'advance'))}
          </div>
        </section>
      )}

      {/* Paid invoices as bukti pembayaran */}
      {paidInvoices.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-xl font-semibold text-gray-900">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Bukti Pembayaran (Lunas)
          </h2>
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">No. Invoice</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Keterangan</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Jumlah</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paidInvoices.map((inv) => (
                  <tr key={inv._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-mono text-gray-600">{inv.invoiceNumber}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{inv.description}</td>
                    <td className="px-4 py-3 text-sm text-right font-semibold">{formatCurrency(inv.amount)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openInvoiceReceipt(inv)}
                        className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-sm hover:bg-gray-50"
                      >
                        <Printer className="h-4 w-4" /> Cetak Bukti
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Historical receipts — ledger */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-xl font-semibold text-gray-900">
          <Receipt className="h-5 w-5 text-primary-600" />
          Riwayat Pembayaran
        </h2>

        <div className="overflow-hidden rounded-lg bg-white shadow">
          {loadingTx ? (
            <div className="flex items-center justify-center gap-2 p-8 text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin" /> Memuat riwayat...
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Belum ada riwayat pembayaran.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Tanggal</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Keterangan</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Kategori</th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">Jumlah</th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {transactions.map((tx) => (
                    <tr key={tx.transactionId} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {formatDate(String(tx.timestamp))}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {tx.metaData?.description || CATEGORY_LABELS[tx.category] || '-'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className="rounded-full bg-primary-50 px-2 py-1 text-xs font-medium text-primary-700">
                          {CATEGORY_LABELS[tx.category] || tx.category}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-semibold text-gray-900">
                        {formatCurrency(tx.amount)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => openReceipt(tx)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                          <Printer className="h-4 w-4" /> Cetak Bukti
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <PrintableReceipt
        data={receipt}
        open={receiptOpen}
        onClose={() => setReceiptOpen(false)}
      />
    </div>
  );
}
