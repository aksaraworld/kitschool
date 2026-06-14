'use client';

import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import FinanceCatalogApp from '@/components/Finance/FinanceCatalogApp';
import { FINANCE_CATALOG_ROLES } from '@/lib/types';

export default function FinanceCatalogPage() {
  return (
    <ProtectedRoute allowedRoles={FINANCE_CATALOG_ROLES}>
      <FinanceCatalogApp />
    </ProtectedRoute>
  );
}
