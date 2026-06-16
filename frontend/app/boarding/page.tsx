'use client';

import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import BoardingApp from '@/components/Boarding/BoardingApp';
import { BedDouble } from 'lucide-react';
import { useEffect, useState } from 'react';
import api from '@/lib/aksara-api';
import { UserRole } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';

export default function BoardingPage() {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user || user.role === UserRole.SAAS_ADMIN) return;
    api
      .getCached<{ school?: { modules?: { boardingSchool?: boolean } } }>('/boarding/summary')
      .then((d) => setEnabled(!!d.school?.modules?.boardingSchool))
      .catch(() => setEnabled(false));
  }, [user]);

  if (user?.role === UserRole.SAAS_ADMIN) {
    return (
      <ProtectedRoute>
        <p className="p-8 text-gray-600">Halaman asrama untuk staf sekolah.</p>
      </ProtectedRoute>
    );
  }

  if (enabled === null) {
    return (
      <ProtectedRoute>
        <p className="p-8">Memuat...</p>
      </ProtectedRoute>
    );
  }

  if (!enabled) {
    return (
      <ProtectedRoute>
        <div className="p-8 max-w-lg">
          <p className="text-gray-600">Modul asrama belum diaktifkan. Aktifkan via SaaS Admin → Edit Sekolah.</p>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BedDouble className="w-7 h-7 text-primary-600" /> Manajemen Asrama
          </h1>
          <p className="text-gray-600 mt-1 text-sm">Kamar, absensi, izin keluar, HP, dan keuangan santri.</p>
        </div>
        <BoardingApp />
      </div>
    </ProtectedRoute>
  );
}
