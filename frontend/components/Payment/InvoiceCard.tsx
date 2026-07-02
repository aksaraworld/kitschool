'use client';

import Link from 'next/link';
import { Invoice } from '@/lib/types';
import { formatIDR } from '@aksara/formatters';
import { FileText, Calendar, CreditCard, CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface InvoiceCardProps {
  invoice: Invoice;
  /** Kept for backwards compatibility with callers; no longer triggers a modal. */
  onPaymentSuccess?: () => void;
  showPaymentButton?: boolean;
}

export default function InvoiceCard({ invoice, showPaymentButton = true }: InvoiceCardProps) {
  const formatCurrency = (amount: number) => formatIDR(amount);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'partial':
        return 'bg-blue-100 text-blue-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Lunas';
      case 'pending':
        return 'Menunggu';
      case 'partial':
        return 'Sebagian';
      case 'overdue':
        return 'Terlambat';
      case 'cancelled':
        return 'Dibatalkan';
      default:
        return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'overdue':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <FileText className="w-5 h-5 text-gray-600" />;
    }
  };

  return (
      <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            {getStatusIcon(invoice.status)}
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{invoice.invoiceNumber}</h3>
              <p className="text-sm text-gray-500">{invoice.description || 'Tagihan SPP'}</p>
            </div>
          </div>
          <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(invoice.status)}`}>
            {getStatusLabel(invoice.status)}
          </span>
        </div>

        <div className="space-y-3 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Total Tagihan</span>
            <span className="font-semibold text-gray-900">{formatCurrency(invoice.amount)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Sudah Dibayar</span>
            <span className="font-medium text-green-600">{formatCurrency(invoice.paidAmount)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Sisa Tagihan</span>
            <span className="font-bold text-red-600">{formatCurrency(invoice.remainingAmount)}</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4" />
            <span>Jatuh Tempo: {new Date(invoice.dueDate).toLocaleDateString('id-ID')}</span>
          </div>
        </div>

        {invoice.items && invoice.items.length > 0 && (
          <div className="border-t pt-4 mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Rincian Tagihan</h4>
            <div className="space-y-2">
              {invoice.items.map((item, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-gray-600">{item.description}</span>
                  <span className="text-gray-900">{formatCurrency(item.total)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {showPaymentButton && invoice.remainingAmount > 0 && invoice.status !== 'cancelled' && (
          <div className="mt-4 pt-4 border-t">
            <Link
              href="/finance/parent"
              className="w-full bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center justify-center space-x-2"
            >
              <CreditCard className="w-4 h-4" />
              <span>Bayar via Aplikasi</span>
            </Link>
          </div>
        )}
      </div>
  );
}


