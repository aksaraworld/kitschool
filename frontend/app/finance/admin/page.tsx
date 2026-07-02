'use client';

import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import AdminTreasuryApp from '@/components/Finance/AdminTreasuryApp';
import { FINANCE_REPORT_ROLES } from '@/lib/types';

export default function AdminTreasuryPage() {
  return (
    <ProtectedRoute allowedRoles={FINANCE_REPORT_ROLES}>
      <AdminTreasuryApp />
    </ProtectedRoute>
  );
}
