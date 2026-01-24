'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import { UserRole } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/aksara-api';
import {
  Users,
  Calendar,
  CreditCard,
  ClipboardCheck,
  TrendingUp,
  BookOpen
} from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>({});

  useEffect(() => {
    // Fetch dashboard stats based on user role
    const fetchStats = async () => {
      try {
        // This would be replaced with actual API calls
        setStats({
          students: 0,
          teachers: 0,
          classes: 0,
          payments: 0,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();
  }, []);

  const getRoleSpecificStats = () => {
    if (!user) return [];

    switch (user.role) {
      case UserRole.STUDENT:
        return [
          { label: 'Tingkat Kehadiran', value: '95%', icon: ClipboardCheck, color: 'bg-green-500' },
          { label: 'Acara Mendatang', value: '5', icon: Calendar, color: 'bg-blue-500' },
        ];
      case UserRole.PARENT:
        return [
          { label: 'Anak', value: '2', icon: Users, color: 'bg-purple-500' },
          { label: 'Tagihan Tertunda', value: '1', icon: CreditCard, color: 'bg-yellow-500' },
          { label: 'Pesan', value: '3', icon: Calendar, color: 'bg-blue-500' },
        ];
      case UserRole.TEACHER:
      case UserRole.HOMEROOM_TEACHER:
        return [
          { label: 'Kelas Saya', value: '3', icon: BookOpen, color: 'bg-blue-500' },
          { label: 'Tingkat Kehadiran', value: '98%', icon: ClipboardCheck, color: 'bg-green-500' },
        ];
      case UserRole.STAFF:
      case UserRole.PRINCIPAL:
        return [
          { label: 'Total Siswa', value: '450', icon: Users, color: 'bg-blue-500' },
          { label: 'Total Guru', value: '35', icon: Users, color: 'bg-purple-500' },
          { label: 'Kelas Aktif', value: '18', icon: BookOpen, color: 'bg-green-500' },
          { label: 'Tagihan Tertunda', value: '12', icon: CreditCard, color: 'bg-yellow-500' },
        ];
      case UserRole.FINANCE:
        return [
          { label: 'Tagihan Tertunda', value: '45', icon: CreditCard, color: 'bg-yellow-500' },
          { label: 'Pendapatan Bulan Ini', value: 'Rp 125M', icon: TrendingUp, color: 'bg-green-500' },
        ];
      default:
        return [];
    }
  };

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">Selamat datang kembali, {user?.name}!</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {getRoleSpecificStats().map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
                  </div>
                  <div className={`${stat.color} p-3 rounded-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Aksi Cepat</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Quick action buttons based on role */}
            {user?.role === UserRole.STUDENT && (
              <>
                <a
                  href="/attendance"
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <ClipboardCheck className="w-6 h-6 text-primary-600 mb-2" />
                  <p className="font-medium">Kirim Kehadiran</p>
                </a>
                <a
                  href="/calendar"
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Calendar className="w-6 h-6 text-primary-600 mb-2" />
                  <p className="font-medium">Lihat Kalender</p>
                </a>
              </>
            )}
            {user?.role === UserRole.PARENT && (
              <>
                <a
                  href="/invoices"
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <CreditCard className="w-6 h-6 text-primary-600 mb-2" />
                  <p className="font-medium">Bayar Tagihan</p>
                </a>
                <a
                  href="/messages"
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Calendar className="w-6 h-6 text-primary-600 mb-2" />
                  <p className="font-medium">Pesan Guru</p>
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

