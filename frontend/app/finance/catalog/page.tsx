'use client';

import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import FinanceBillingSetup from '@/components/Finance/FinanceBillingSetup';
import { FINANCE_CATALOG_ROLES } from '@/lib/types';

export default function FinanceCatalogPage() {
  return (
    <ProtectedRoute allowedRoles={FINANCE_CATALOG_ROLES}>
      <FinanceBillingSetup />
    </ProtectedRoute>
  );
}
