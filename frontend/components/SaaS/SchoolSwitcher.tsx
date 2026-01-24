'use client';

import Link from 'next/link';
import { Building2, Loader2, ArrowUpRight } from 'lucide-react';
import { useSchoolContext } from '@/hooks/useSchoolContext';

export default function SchoolSwitcher() {
  const {
    schools,
    selectedSchoolId,
    selectedSchool,
    selectSchool,
    isLoading,
    isSaasAdmin,
  } = useSchoolContext();

  if (!isSaasAdmin) {
    return null;
  }

  return (
    <div className="flex items-center space-x-4">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center">
          <Building2 className="w-5 h-5 text-primary-600" />
        </div>
        <div>
          <p className="text-xs text-gray-500">Sekolah Aktif</p>
          {isLoading ? (
            <div className="flex items-center text-sm text-gray-600">
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Memuat sekolah...
            </div>
          ) : schools.length ? (
            <select
              className="mt-0.5 w-56 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              value={selectedSchoolId || ''}
              onChange={(e) => selectSchool(e.target.value || null)}
            >
              <option value="">Semua Sekolah</option>
              {schools.map((school) => (
                <option key={school._id} value={school._id}>
                  {school.name} ({school.city})
                </option>
              ))}
            </select>
          ) : (
            <p className="text-sm text-gray-500">Tidak ada sekolah</p>
          )}
        </div>
      </div>

      <div className="text-sm text-gray-500">
        {selectedSchool
          ? `Status: ${selectedSchool.subscriptionStatus.toUpperCase()}`
          : 'Menampilkan semua sekolah'}
      </div>

      <Link
        href="/saas/schools"
        className="inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
      >
        Kelola Sekolah
        <ArrowUpRight className="w-4 h-4 ml-1" />
      </Link>
    </div>
  );
}


