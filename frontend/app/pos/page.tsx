'use client';

import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import PosApp from '@/components/Finance/PosApp';
import { FINANCE_POS_ROLES } from '@/lib/types';

export default function PosPage() {
  return (
    <ProtectedRoute allowedRoles={FINANCE_POS_ROLES}>
      <PosApp />
    </ProtectedRoute>
  );
}
