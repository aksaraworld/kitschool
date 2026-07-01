'use client';

import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import BkApp from '@/components/Bk/BkApp';
import { BK_VIEW_ROLES } from '@/lib/types';
import { Shield } from 'lucide-react';

export default function BkPage() {
  return (
    <ProtectedRoute allowedRoles={BK_VIEW_ROLES}>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-7 h-7 text-primary-600" /> BK & Kedisiplinan
          </h1>
          <p className="text-gray-600 mt-1 text-sm">
            Sistem poin demerit/merit, peringatan otomatis ke orang tua, dan buku kasus konseling digital.
          </p>
        </div>
        <BkApp />
      </div>
    </ProtectedRoute>
  );
}
