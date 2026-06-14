'use client';

import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import FinanceReportsApp from '@/components/Finance/FinanceReportsApp';
import { FINANCE_REPORT_ROLES } from '@/lib/types';

export default function FinanceReportsPage() {
  return (
    <ProtectedRoute allowedRoles={FINANCE_REPORT_ROLES}>
      <FinanceReportsApp />
    </ProtectedRoute>
  );
}
