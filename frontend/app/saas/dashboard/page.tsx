'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import { Configuration, School, SubscriptionStatus, TransactionFeeStatistics, UserRole } from '@/lib/types';
import api from '@/lib/aksara-api';
import { useSchoolContext } from '@/hooks/useSchoolContext';
import {
  Building2,
  Layers,
  ShieldAlert,
  Percent,
  Wallet,
  TrendingUp,
  Activity,
} from 'lucide-react';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(
    value || 0
  );

export default function SaasDashboardPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [stats, setStats] = useState<TransactionFeeStatistics | null>(null);
  const [config, setConfig] = useState<Configuration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { selectedSchool } = useSchoolContext();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [schoolsData, statsData, configData] = await Promise.all([
          api.get<School[]>('/schools'),
          api.get<TransactionFeeStatistics>('/transaction-fees/statistics'),
          api.get<Configuration[]>('/config'),
        ]);
        setSchools(schoolsData);
        setStats(statsData);
        setConfig(configData);
      } catch (error) {
        console.error('Error fetching SaaS dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const getConfigValue = (key: string, fallback = 0) =>
    config.find((item) => item.key === key)?.value ?? fallback;

  const totalSchools = schools.length;
  const activeSchools = schools.filter((school) => school.subscriptionStatus === SubscriptionStatus.ACTIVE).length;
  const trialSchools = schools.filter((school) => school.subscriptionStatus === SubscriptionStatus.TRIAL).length;
  const attentionSchools = schools.filter((school) =>
    [SubscriptionStatus.SUSPENDED, SubscriptionStatus.CANCELLED, SubscriptionStatus.EXPIRED].includes(
      school.subscriptionStatus
    )
  ).length;
  const adminFeePercentage = getConfigValue('admin_fee_percentage', 10);

  const dashboardCards = [
    {
      label: 'Total Sekolah',
      value: totalSchools,
      icon: Building2,
      color: 'bg-primary-50 text-primary-700',
    },
    {
      label: 'Sekolah Aktif',
      value: activeSchools,
      icon: Layers,
      color: 'bg-emerald-50 text-emerald-700',
    },
    {
      label: 'Dalam Masa Trial',
      value: trialSchools,
      icon: Activity,
      color: 'bg-blue-50 text-blue-700',
    },
    {
      label: 'Butuh Perhatian',
      value: attentionSchools,
      icon: ShieldAlert,
      color: 'bg-rose-50 text-rose-700',
    },
  ];

  return (
    <ProtectedRoute allowedRoles={[UserRole.SAAS_ADMIN]}>
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard SaaS Admin</h1>
          <p className="text-gray-600">
            Pantau performa seluruh sekolah dan arus pendapatan platform dalam satu tempat.
          </p>
        </div>

        {isLoading ? (
          <div className="bg-white rounded-lg shadow p-10 text-center">
            <div className="inline-flex items-center space-x-3 text-gray-600">
              <span className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></span>
              <span>Memuat data...</span>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {dashboardCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div key={card.label} className="bg-white rounded-xl shadow p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">{card.label}</p>
                        <p className="text-3xl font-bold text-gray-900 mt-2">{card.value}</p>
                      </div>
                      <div className={`p-3 rounded-full ${card.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Admin Fee Saat Ini</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{adminFeePercentage}%</p>
                  </div>
                  <div className="p-3 rounded-full bg-amber-50 text-amber-600">
                    <Percent className="w-6 h-6" />
                  </div>
                </div>
                <p className="mt-4 text-sm text-gray-600">
                  Biaya admin diterapkan pada seluruh transaksi dan otomatis dibagi sesuai konfigurasi fee.
                </p>
              </div>

              <div className="bg-white rounded-xl shadow p-6 lg:col-span-2">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-sm text-gray-500">Statistik Pendapatan Admin Fee</p>
                    <p className="text-xl font-semibold text-gray-900 mt-1">
                      {formatCurrency(stats?.totalAdminFee || 0)}
                    </p>
                  </div>
                  <div className="p-3 rounded-full bg-primary-50 text-primary-600">
                    <Wallet className="w-6 h-6" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="border rounded-lg p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Invoice Diproses</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">
                      {stats?.totalTransactions ?? 0}
                    </p>
                  </div>
                  <div className="border rounded-lg p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Nilai Transaksi</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">
                      {formatCurrency(stats?.totalTransactionAmount || 0)}
                    </p>
                  </div>
                  <div className="border rounded-lg p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Netto Untuk Sekolah</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">
                      {formatCurrency(stats?.totalNetAmount || 0)}
                    </p>
                  </div>
                </div>

                <div className="mt-6">
                  <p className="text-sm font-medium text-gray-700 mb-3">Breakdown Admin Fee</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="bg-primary-50 rounded-lg p-4">
                      <p className="text-xs text-gray-600">Payment Gateway</p>
                      <p className="text-lg font-semibold text-primary-700">
                        {formatCurrency(stats?.feeBreakdown.paymentGateway || 0)}
                      </p>
                    </div>
                    <div className="bg-emerald-50 rounded-lg p-4">
                      <p className="text-xs text-gray-600">Platform</p>
                      <p className="text-lg font-semibold text-emerald-700">
                        {formatCurrency(stats?.feeBreakdown.platform || 0)}
                      </p>
                    </div>
                    <div className="bg-indigo-50 rounded-lg p-4">
                      <p className="text-xs text-gray-600">Pajak</p>
                      <p className="text-lg font-semibold text-indigo-700">
                        {formatCurrency(stats?.feeBreakdown.tax || 0)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-primary-600 to-primary-500 rounded-xl text-white p-6">
                <p className="text-sm text-white/80">Sekolah Fokus</p>
                {selectedSchool ? (
                  <>
                    <p className="text-2xl font-bold mt-2">{selectedSchool.name}</p>
                    <p className="text-white/80 text-sm mt-1">{selectedSchool.city}</p>
                    <div className="mt-4 p-4 bg-white/10 rounded-lg">
                      <p className="text-sm text-white/80">Status Subscription</p>
                      <p className="text-lg font-semibold mt-1">{selectedSchool.subscriptionStatus}</p>
                      <p className="text-sm text-white/70 mt-2">
                        Biaya per murid:{' '}
                        {selectedSchool.subscriptionFeePerStudent
                          ? formatCurrency(selectedSchool.subscriptionFeePerStudent)
                          : 'Mengikuti default platform'}
                      </p>
                    </div>
                  </>
                ) : (
                  <p className="text-lg font-semibold mt-2">Pilih sekolah untuk melihat detail fokus.</p>
                )}
              </div>

              <div className="bg-white rounded-xl shadow p-6 lg:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-gray-500">Daftar Sekolah</p>
                    <p className="text-xl font-semibold text-gray-900 mt-1">Top 6 Sekolah Terbaru</p>
                  </div>
                  <div className="p-3 rounded-full bg-gray-100 text-gray-600">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        <th className="px-4 py-3">Sekolah</th>
                        <th className="px-4 py-3">Kota</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Biaya / Murid</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {schools.slice(0, 6).map((school) => (
                        <tr key={school._id}>
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium text-gray-900">{school.name}</p>
                            <p className="text-xs text-gray-500">ID: {school._id}</p>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{school.city}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                school.subscriptionStatus === SubscriptionStatus.ACTIVE
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : school.subscriptionStatus === SubscriptionStatus.TRIAL
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-rose-100 text-rose-700'
                              }`}
                            >
                              {school.subscriptionStatus}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-900">
                            {school.subscriptionFeePerStudent
                              ? formatCurrency(school.subscriptionFeePerStudent)
                              : 'Default'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}



