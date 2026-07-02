'use client';

/**
 * AdminTreasuryApp — school treasury panel.
 *  1. Master ledger audit log (GET /api/payments/transactions?scope=school),
 *     filterable by category + free-text, mapped to invoiceId via metaData.referenceId.
 *  2. Disbursement form (POST /api/payments/disburse) → Xendit Payout, debits the
 *     school-system wallet and appends an outflow row to /transactions.
 *
 * Uses only existing/additive endpoints via `@/lib/aksara-api`.
 */

import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/aksara-api';
import { formatIDR } from '@aksara/formatters';
import type { LedgerTransaction } from '@/lib/types/ledger';
import {
  Wallet,
  Landmark,
  Loader2,
  ArrowDownCircle,
  ArrowUpCircle,
  Filter,
  Send,
  CheckCircle2,
} from 'lucide-react';

const formatCurrency = (n: number): string => formatIDR(n || 0);

function formatDateTime(value?: string): string {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const CATEGORY_LABELS: Record<string, string> = {
  WALLET_REFILL: 'Isi Saldo',
  TUITION_PAYMENT: 'Pembayaran SPP',
  CANTEEN_ITEM_PURCHASE: 'Pembelian Kantin',
  STORE_ITEM_PURCHASE: 'Pembelian Toko',
  CANTEEN_PAYOUT: 'Pencairan / Payout',
};

const CATEGORY_OPTIONS = Object.keys(CATEGORY_LABELS);

/** Indonesian bank/e-wallet channel codes for Xendit Payout (v2 Payouts). */
const CHANNEL_CODES: { code: string; label: string }[] = [
  { code: 'ID_BCA', label: 'BCA' },
  { code: 'ID_BNI', label: 'BNI' },
  { code: 'ID_BRI', label: 'BRI' },
  { code: 'ID_MANDIRI', label: 'Mandiri' },
  { code: 'ID_BSI', label: 'Bank Syariah Indonesia (BSI)' },
  { code: 'ID_CIMB', label: 'CIMB Niaga' },
  { code: 'ID_PERMATA', label: 'Permata' },
  { code: 'ID_DANAMON', label: 'Danamon' },
  { code: 'ID_OVO', label: 'OVO (e-wallet)' },
  { code: 'ID_DANA', label: 'DANA (e-wallet)' },
  { code: 'ID_GOPAY', label: 'GoPay (e-wallet)' },
  { code: 'ID_SHOPEEPAY', label: 'ShopeePay (e-wallet)' },
];

const SCHOOL_WALLET_PREFIX = 'SCHOOL_SYSTEM_';

export default function AdminTreasuryApp() {
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [search, setSearch] = useState('');

  // Disbursement form state
  const [channelCode, setChannelCode] = useState('ID_BCA');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  useEffect(() => {
    void loadLedger(categoryFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryFilter]);

  async function loadLedger(category: string) {
    try {
      setLoading(true);
      const params: Record<string, unknown> = { scope: 'school', limit: 500 };
      if (category) params.category = category;
      const data = await api.get<LedgerTransaction[]>('/payments/transactions', {
        params,
        skipCache: true,
      });
      setTransactions(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('loadLedger error:', e);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return transactions;
    return transactions.filter((tx) => {
      const haystack = [
        tx.transactionId,
        tx.metaData?.referenceId,
        tx.metaData?.description,
        tx.category,
        tx.sourceWalletId,
        tx.destinationWalletId,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [transactions, search]);

  const totals = useMemo(() => {
    let inflow = 0;
    let outflow = 0;
    for (const tx of transactions) {
      const toSchool = String(tx.destinationWalletId ?? '').startsWith(SCHOOL_WALLET_PREFIX);
      if (toSchool) inflow += tx.amount ?? 0;
      else outflow += tx.amount ?? 0;
    }
    return { inflow, outflow, net: inflow - outflow };
  }, [transactions]);

  async function submitDisbursement(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setFormError('Nominal tidak valid');
      return;
    }
    if (!accountNumber.trim() || !accountHolderName.trim()) {
      setFormError('Nomor rekening dan nama pemilik wajib diisi');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post<{ payoutId: string; status: string; referenceId: string }>(
        '/payments/disburse',
        {
          channelCode,
          accountNumber: accountNumber.trim(),
          accountHolderName: accountHolderName.trim(),
          amount: amt,
          description: description.trim() || undefined,
        }
      );
      setFormSuccess(
        `Pencairan berhasil dikirim (status: ${res.status}). Ref: ${res.referenceId}`
      );
      setAccountNumber('');
      setAccountHolderName('');
      setAmount('');
      setDescription('');
      await loadLedger(categoryFilter);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Gagal memproses pencairan');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Kas & Bendahara</h1>
        <p className="mt-2 text-gray-600">Audit buku besar dan pencairan dana sekolah</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-lg border-l-4 border-green-500 bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Dana Masuk</p>
              <p className="mt-2 text-2xl font-bold text-green-600">{formatCurrency(totals.inflow)}</p>
            </div>
            <ArrowDownCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>
        <div className="rounded-lg border-l-4 border-red-500 bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Dana Keluar</p>
              <p className="mt-2 text-2xl font-bold text-red-600">{formatCurrency(totals.outflow)}</p>
            </div>
            <ArrowUpCircle className="h-8 w-8 text-red-500" />
          </div>
        </div>
        <div className="rounded-lg border-l-4 border-primary-500 bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Saldo Bersih Kas</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{formatCurrency(totals.net)}</p>
            </div>
            <Wallet className="h-8 w-8 text-primary-600" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Ledger audit */}
        <div className="xl:col-span-2">
          <div className="rounded-lg bg-white shadow">
            <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="flex items-center gap-2 text-xl font-semibold text-gray-900">
                <Landmark className="h-5 w-5 text-primary-600" />
                Buku Besar (Ledger)
              </h2>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Filter className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="rounded-lg border border-gray-300 bg-white py-2 pl-8 pr-3 text-sm text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Semua Kategori</option>
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {CATEGORY_LABELS[c]}
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari ID / invoice / ket..."
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              {loading ? (
                <div className="flex items-center justify-center gap-2 p-8 text-gray-500">
                  <Loader2 className="h-5 w-5 animate-spin" /> Memuat buku besar...
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center text-gray-500">Belum ada transaksi.</div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Waktu</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Kategori</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Keterangan</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Invoice</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Arah</th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Nominal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filtered.map((tx) => {
                      const toSchool = String(tx.destinationWalletId ?? '').startsWith(
                        SCHOOL_WALLET_PREFIX
                      );
                      return (
                        <tr key={tx.transactionId} className="hover:bg-gray-50">
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                            {formatDateTime(String(tx.timestamp))}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <span className="rounded-full bg-primary-50 px-2 py-1 text-xs font-medium text-primary-700">
                              {CATEGORY_LABELS[tx.category] || tx.category}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-800">
                            {tx.metaData?.description || '-'}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-gray-500">
                            {tx.metaData?.referenceId || '—'}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            {toSchool ? (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                                <ArrowDownCircle className="h-4 w-4" /> Masuk
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
                                <ArrowUpCircle className="h-4 w-4" /> Keluar
                              </span>
                            )}
                          </td>
                          <td
                            className={`whitespace-nowrap px-4 py-3 text-right text-sm font-semibold ${
                              toSchool ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {toSchool ? '+' : '−'}
                            {formatCurrency(tx.amount)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Disbursement form */}
        <div className="xl:col-span-1">
          <form
            onSubmit={submitDisbursement}
            className="sticky top-6 space-y-4 rounded-xl border border-gray-100 bg-white p-5 shadow-sm"
          >
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Send className="h-5 w-5 text-primary-600" />
              Pencairan Dana (Payout)
            </h2>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Bank / E-Wallet</label>
              <select
                value={channelCode}
                onChange={(e) => setChannelCode(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
              >
                {CHANNEL_CODES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Nomor Rekening / Akun</label>
              <input
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                inputMode="numeric"
                placeholder="1234567890"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Nama Pemilik Rekening</label>
              <input
                value={accountHolderName}
                onChange={(e) => setAccountHolderName(e.target.value)}
                placeholder="Yayasan Kita"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Nominal Pencairan</label>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                type="number"
                min={1}
                placeholder="100000"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
              />
              {Number(amount) > 0 && (
                <p className="mt-1 text-xs text-gray-500">{formatCurrency(Number(amount))}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Keterangan (opsional)</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Dana operasional bulan ini"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {formError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {formError}
              </div>
            )}
            {formSuccess && (
              <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{formSuccess}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-3 font-semibold text-white transition hover:bg-primary-700 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" /> Mengirim...
                </>
              ) : (
                <>
                  <Send className="h-5 w-5" /> Kirim Pencairan
                </>
              )}
            </button>

            <p className="text-center text-xs text-gray-400">
              Dana ditarik dari kas sekolah dan dikirim via Xendit Payout (mode TEST).
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
