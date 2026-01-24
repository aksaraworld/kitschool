'use client';

import { useMemo, useState } from 'react';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import { SubscriptionStatus, UserRole } from '@/lib/types';
import { useSchoolContext } from '@/hooks/useSchoolContext';
import api from '@/lib/aksara-api';
import { Search, RefreshCw, CheckCircle2, AlertTriangle, Building2 } from 'lucide-react';

const statusBadge = (status: SubscriptionStatus) => {
  switch (status) {
    case SubscriptionStatus.ACTIVE:
      return 'bg-emerald-100 text-emerald-700';
    case SubscriptionStatus.TRIAL:
      return 'bg-blue-100 text-blue-700';
    case SubscriptionStatus.SUSPENDED:
    case SubscriptionStatus.CANCELLED:
    case SubscriptionStatus.EXPIRED:
    default:
      return 'bg-rose-100 text-rose-700';
  }
};

export default function SaasSchoolsPage() {
  const {
    schools,
    selectedSchoolId,
    selectSchool,
    refreshSchools,
    isLoading,
  } = useSchoolContext();
  const [search, setSearch] = useState('');
  const [activatingId, setActivatingId] = useState<string | null>(null);

  const filteredSchools = useMemo(() => {
    if (!search) return schools;
    return schools.filter((school) =>
      [school.name, school.city, school.email].some((value) =>
        value?.toLowerCase().includes(search.toLowerCase())
      )
    );
  }, [schools, search]);

  const handleToggleActive = async (schoolId: string, currentStatus: boolean) => {
    try {
      setActivatingId(schoolId);
      await api.put(`/schools/${schoolId}`, { isActive: !currentStatus });
      await refreshSchools();
    } catch (error) {
      console.error('Failed to update school status', error);
    } finally {
      setActivatingId(null);
    }
  };

  return (
    <ProtectedRoute allowedRoles={[UserRole.SAAS_ADMIN]}>
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-gray-900">Manajemen Sekolah</h1>
          <p className="text-gray-600">
            Kelola seluruh sekolah yang terdaftar, pantau status subscription, dan pilih sekolah aktif
            untuk konteks operasi.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center border border-gray-300 rounded-lg px-4 py-2 w-full md:max-w-sm">
              <Search className="w-4 h-4 text-gray-400 mr-2" />
              <input
                type="text"
                placeholder="Cari sekolah berdasarkan nama, kota, atau email..."
                className="flex-1 border-none focus:ring-0 text-gray-900 placeholder:text-gray-500 bg-transparent"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button
              onClick={refreshSchools}
              className="inline-flex items-center justify-center px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Segarkan Data
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Sekolah
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Kota
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Status Subscription
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Akun
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                      Memuat data sekolah...
                    </td>
                  </tr>
                ) : filteredSchools.length ? (
                  filteredSchools.map((school) => (
                    <tr key={school._id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <p className="text-sm font-semibold text-gray-900">{school.name}</p>
                        <p className="text-xs text-gray-500">{school.email}</p>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">{school.city}</td>
                      <td className="px-4 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadge(school.subscriptionStatus)}`}>
                          {school.subscriptionStatus}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <div className="flex items-center space-x-2">
                          {school.isActive ? (
                            <span className="flex items-center text-emerald-600">
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              Aktif
                            </span>
                          ) : (
                            <span className="flex items-center text-rose-600">
                              <AlertTriangle className="w-4 h-4 mr-1" />
                              Nonaktif
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right space-x-2">
                        <button
                          onClick={() => selectSchool(school._id)}
                          className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium ${
                            selectedSchoolId === school._id
                              ? 'bg-primary-600 text-white'
                              : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <Building2 className="w-4 h-4 mr-2" />
                          {selectedSchoolId === school._id ? 'Digunakan' : 'Gunakan'}
                        </button>
                        <button
                          onClick={() => handleToggleActive(school._id, school.isActive)}
                          className="inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                          disabled={activatingId === school._id}
                        >
                          {activatingId === school._id ? 'Memproses...' : school.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                      Tidak ada sekolah yang cocok dengan pencarian.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}



