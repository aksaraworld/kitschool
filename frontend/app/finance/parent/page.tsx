'use client';

import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import ParentFinanceApp from '@/components/Finance/ParentFinanceApp';
import { UserRole } from '@/lib/types';

export default function ParentFinancePage() {
  return (
    <ProtectedRoute allowedRoles={[UserRole.PARENT, UserRole.STUDENT]}>
      <ParentFinanceApp />
    </ProtectedRoute>
  );
}
