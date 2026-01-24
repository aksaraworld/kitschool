'use client';

import { useState } from 'react';
import { Invoice, PaymentAttempt, PaymentMethod, PaymentAttemptStatus } from '@/lib/types';
import api from '@/lib/aksara-api';
import { CreditCard, X, Upload, CheckCircle, AlertCircle } from 'lucide-react';

interface PaymentModalProps {
  invoice: Invoice;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PaymentModal({ invoice, isOpen, onClose, onSuccess }: PaymentModalProps) {
  const [formData, setFormData] = useState({
    amount: invoice.remainingAmount,
    paymentMethod: PaymentMethod.BANK_TRANSFER,
    transactionId: '',
    paymentReference: '',
    proofOfPayment: '',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      // Create payment attempt
      const response = await api.post(`/invoices/${invoice._id}/payment-attempts`, {
        amount: formData.amount,
        paymentMethod: formData.paymentMethod,
        transactionId: formData.transactionId,
        paymentReference: formData.paymentReference,
        proofOfPayment: formData.proofOfPayment,
        notes: formData.notes,
        status: PaymentAttemptStatus.PENDING
      });

      onSuccess();
      onClose();
      alert('Pembayaran berhasil dikirim. Menunggu konfirmasi dari admin.');
    } catch (err: any) {
      setError(err.message || 'Gagal mengirim pembayaran');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const paymentMethodLabels: Record<PaymentMethod, string> = {
    [PaymentMethod.BANK_TRANSFER]: 'Transfer Bank',
    [PaymentMethod.CREDIT_CARD]: 'Kartu Kredit',
    [PaymentMethod.DEBIT_CARD]: 'Kartu Debit',
    [PaymentMethod.E_WALLET]: 'E-Wallet',
    [PaymentMethod.CASH]: 'Tunai',
    [PaymentMethod.OTHER]: 'Lainnya'
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Bayar Tagihan</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Invoice Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">Informasi Tagihan</h3>
            <div className="space-y-1 text-sm">
              <p><span className="font-medium">No. Invoice:</span> {invoice.invoiceNumber}</p>
              <p><span className="font-medium">Total Tagihan:</span> {formatCurrency(invoice.amount)}</p>
              <p><span className="font-medium">Sudah Dibayar:</span> {formatCurrency(invoice.paidAmount)}</p>
              <p><span className="font-medium">Sisa Tagihan:</span> <span className="text-red-600 font-bold">{formatCurrency(invoice.remainingAmount)}</span></p>
              <p><span className="font-medium">Jatuh Tempo:</span> {new Date(invoice.dueDate).toLocaleDateString('id-ID')}</p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center space-x-2">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Jumlah Pembayaran *
            </label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
              min="0"
              max={invoice.remainingAmount}
              className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder:text-gray-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Maksimal: {formatCurrency(invoice.remainingAmount)}
            </p>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Metode Pembayaran *
            </label>
            <select
              value={formData.paymentMethod}
              onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as PaymentMethod })}
              className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            >
              {Object.values(PaymentMethod).map((method) => (
                <option key={method} value={method}>
                  {paymentMethodLabels[method]}
                </option>
              ))}
            </select>
          </div>

          {/* Transaction ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ID Transaksi / Nomor Referensi
            </label>
            <input
              type="text"
              value={formData.transactionId}
              onChange={(e) => setFormData({ ...formData, transactionId: e.target.value })}
              className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder:text-gray-500"
              placeholder="Masukkan ID transaksi jika ada"
            />
          </div>

          {/* Payment Reference */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Referensi Pembayaran
            </label>
            <input
              type="text"
              value={formData.paymentReference}
              onChange={(e) => setFormData({ ...formData, paymentReference: e.target.value })}
              className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder:text-gray-500"
              placeholder="Masukkan referensi pembayaran"
            />
          </div>

          {/* Proof of Payment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bukti Pembayaran (URL)
            </label>
            <input
              type="url"
              value={formData.proofOfPayment}
              onChange={(e) => setFormData({ ...formData, proofOfPayment: e.target.value })}
              className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder:text-gray-500"
              placeholder="https://example.com/bukti-pembayaran.jpg"
            />
            <p className="text-xs text-gray-500 mt-1">
              Upload bukti pembayaran ke cloud storage dan masukkan URL di sini
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Catatan
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg h-24 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder:text-gray-500"
              placeholder="Tambahkan catatan jika diperlukan"
            />
          </div>

          {/* Submit Button */}
          <div className="flex space-x-4 pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              <CreditCard className="w-5 h-5" />
              <span>{isSubmitting ? 'Mengirim...' : 'Kirim Pembayaran'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Batal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

