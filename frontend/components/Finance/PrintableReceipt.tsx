'use client';

/**
 * PrintableReceipt — zero-server print-to-PDF receipt.
 *
 * Renders a clean, official cash-receipt layout as a modal. All navigational
 * chrome (backdrop + action bar) is hidden on print via `print:hidden` plus a
 * scoped `@media print` visibility rule so the browser's native "Save as PDF"
 * outputs only the receipt — uncropped and full-page — via `window.print()`.
 */

import { useEffect } from 'react';
import { Printer, X, CheckCircle2 } from 'lucide-react';
import { formatIDR } from '@aksara/formatters';

export interface ReceiptData {
  receiptNumber: string;
  dateISO: string;
  schoolName?: string;
  payerName?: string;
  studentName?: string;
  className?: string;
  description: string;
  amount: number;
  method?: string;
  status?: string;
  invoiceNumber?: string;
  transactionId?: string;
  items?: Array<{ label: string; qty?: number; price?: number; total: number }>;
}

interface PrintableReceiptProps {
  data: ReceiptData | null;
  open: boolean;
  onClose: () => void;
  /** Automatically fire window.print() once when opened. */
  autoPrint?: boolean;
}

const formatCurrency = (amount: number): string => formatIDR(amount || 0);

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function PrintableReceipt({ data, open, onClose, autoPrint }: PrintableReceiptProps) {
  useEffect(() => {
    if (open && autoPrint && data) {
      const t = setTimeout(() => window.print(), 350);
      return () => clearTimeout(t);
    }
  }, [open, autoPrint, data]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !data) return null;

  return (
    <>
      {/* Scoped rule: on print, hide the whole app and show only the receipt. */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #printable-receipt, #printable-receipt * { visibility: visible !important; }
          #printable-receipt {
            position: absolute !important;
            left: 0; top: 0; right: 0;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
          }
          @page { margin: 16mm; }
        }
      `}</style>

      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 print:bg-white print:p-0">
        <div className="my-8 w-full max-w-2xl print:my-0">
          {/* Action bar — hidden on print */}
          <div className="mb-3 flex items-center justify-between print:hidden">
            <h3 className="text-lg font-semibold text-white">Bukti Pembayaran</h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
              >
                <Printer className="h-4 w-4" />
                Cetak / Simpan PDF
              </button>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center rounded-lg bg-white/10 p-2 text-white hover:bg-white/20"
                aria-label="Tutup"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Receipt sheet */}
          <div
            id="printable-receipt"
            className="rounded-xl border border-gray-200 bg-white p-8 shadow-2xl print:shadow-none"
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b-2 border-gray-900 pb-5">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {data.schoolName || 'Aksara School Management'}
                </h1>
                <p className="mt-1 text-sm text-gray-500">Bukti Pembayaran Resmi / Official Receipt</p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-wide text-gray-400">No. Bukti</p>
                <p className="font-mono text-sm font-semibold text-gray-900">{data.receiptNumber}</p>
              </div>
            </div>

            {/* Meta */}
            <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-400">Tanggal</p>
                <p className="font-medium text-gray-900">{formatDate(data.dateISO)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-400">Metode</p>
                <p className="font-medium text-gray-900">{data.method || 'Xendit Payment Gateway'}</p>
              </div>
              {data.payerName && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-400">Pembayar</p>
                  <p className="font-medium text-gray-900">{data.payerName}</p>
                </div>
              )}
              {data.studentName && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-400">Siswa</p>
                  <p className="font-medium text-gray-900">
                    {data.studentName}
                    {data.className ? ` — ${data.className}` : ''}
                  </p>
                </div>
              )}
              {data.invoiceNumber && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-400">No. Tagihan</p>
                  <p className="font-mono font-medium text-gray-900">{data.invoiceNumber}</p>
                </div>
              )}
              {data.transactionId && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-400">ID Transaksi</p>
                  <p className="font-mono text-xs font-medium text-gray-700">{data.transactionId}</p>
                </div>
              )}
            </div>

            {/* Line items / description */}
            <div className="mt-6 overflow-hidden rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase text-gray-500">
                      Keterangan
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium uppercase text-gray-500">
                      Jumlah
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.items && data.items.length > 0 ? (
                    data.items.map((item, i) => (
                      <tr key={i}>
                        <td className="px-4 py-3 text-gray-800">
                          {item.label}
                          {item.qty ? (
                            <span className="ml-1 text-gray-400">
                              ({item.qty} × {formatCurrency(item.price ?? 0)})
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900">
                          {formatCurrency(item.total)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="px-4 py-3 text-gray-800">{data.description}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">
                        {formatCurrency(data.amount)}
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-900 text-white">
                    <td className="px-4 py-3 text-sm font-semibold">TOTAL DIBAYAR</td>
                    <td className="px-4 py-3 text-right text-base font-bold">
                      {formatCurrency(data.amount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Status stamp */}
            <div className="mt-6 flex items-center justify-between">
              <div className="inline-flex items-center gap-2 rounded-full bg-green-50 px-4 py-2 text-green-700">
                <CheckCircle2 className="h-5 w-5" />
                <span className="text-sm font-semibold">{data.status || 'LUNAS / PAID'}</span>
              </div>
              <div className="text-right">
                <div className="mb-8 text-xs text-gray-400">Hormat kami,</div>
                <div className="border-t border-gray-300 pt-1 text-xs text-gray-600">
                  Bagian Keuangan
                </div>
              </div>
            </div>

            <p className="mt-8 border-t border-dashed border-gray-200 pt-4 text-center text-xs text-gray-400">
              Dokumen ini sah dan dihasilkan secara elektronik oleh sistem. Tidak memerlukan tanda tangan basah.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
