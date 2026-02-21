'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import { UserRole, Payment, PaymentStatus, hasAnyRole } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/aksara-api';
import { CreditCard, CheckCircle, Clock, XCircle, DollarSign } from 'lucide-react';

export default function PaymentsPage() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const paymentsData = await api.get<Payment[]>('/payments');
      setPayments(paymentsData);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPaid = async (paymentId: string) => {
    try {
      await api.put(`/payments/${paymentId}`, {
        status: PaymentStatus.PAID,
        paidDate: new Date().toISOString()
      });
      fetchPayments();
      alert('Payment marked as paid!');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Gagal memperbarui pembayaran');
    }
  };

  const getStatusIcon = (status: PaymentStatus) => {
    switch (status) {
      case PaymentStatus.PAID:
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case PaymentStatus.PENDING:
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case PaymentStatus.OVERDUE:
        return <XCircle className="w-5 h-5 text-red-500" />;
      case PaymentStatus.CANCELLED:
        return <XCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: PaymentStatus) => {
    switch (status) {
      case PaymentStatus.PAID:
        return 'bg-green-100 text-green-800';
      case PaymentStatus.PENDING:
        return 'bg-yellow-100 text-yellow-800';
      case PaymentStatus.OVERDUE:
        return 'bg-red-100 text-red-800';
      case PaymentStatus.CANCELLED:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const canMarkAsPaid = user?.role === UserRole.PARENT || hasAnyRole(user, [UserRole.FINANCE]);

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pembayaran</h1>
          <p className="text-gray-600 mt-2">Kelola pembayaran biaya bulanan</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Pembayaran</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {formatCurrency(payments.reduce((sum, p) => sum + p.amount, 0))}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-primary-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Menunggu</p>
                <p className="text-2xl font-bold text-yellow-600 mt-2">
                  {payments.filter((p) => p.status === PaymentStatus.PENDING).length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Lunas</p>
                <p className="text-2xl font-bold text-green-600 mt-2">
                  {payments.filter((p) => p.status === PaymentStatus.PAID).length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>

        {/* Payments Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Catatan Pembayaran</h2>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center">Memuat...</div>
            ) : payments.length === 0 ? (
              <div className="p-8 text-center text-gray-500">Tidak ada catatan pembayaran</div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Siswa
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Bulan/Tahun
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Jumlah
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Jatuh Tempo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {payments.map((payment) => (
                    <tr key={payment._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getStatusIcon(payment.status)}
                          <span className="ml-2 text-sm font-medium text-gray-900">
                            {(payment as any).studentId?.name || 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(payment.year, payment.month - 1).toLocaleDateString('en-US', {
                          month: 'long',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(payment.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(payment.dueDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                            payment.status
                          )}`}
                        >
                          {payment.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {canMarkAsPaid && payment.status === PaymentStatus.PENDING && (
                          <button
                            onClick={() => handleMarkAsPaid(payment._id)}
                            className="text-primary-600 hover:text-primary-800 font-medium"
                          >
                            Tandai Lunas
                          </button>
                        )}
                        {payment.status === PaymentStatus.PAID && payment.paidDate && (
                          <span className="text-gray-500 text-xs">
                            Lunas pada {new Date(payment.paidDate).toLocaleDateString()}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

