'use client';

import { useParams } from 'next/navigation';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import { UserRole, ROLES_CAN_MANAGE_USERS, hasAnyRole } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import ProfileView from '@/components/Profile/ProfileView';

export default function ProfileByIdPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const canViewOther =
    hasAnyRole(user, ROLES_CAN_MANAGE_USERS.map(String)) ||
    (user?.role === UserRole.PARENT && user?.children?.includes(id!));

  if (!canViewOther) {
    return (
      <ProtectedRoute>
        <div className="p-8 text-center text-red-600">Anda tidak memiliki akses untuk melihat profil ini.</div>
      </ProtectedRoute>
    );
  }

  const canEditMedical = hasAnyRole(user, ROLES_CAN_MANAGE_USERS.map(String));

  return (
    <ProtectedRoute>
      <ProfileView userId={id!} isOwnProfile={user?._id === id} canEditMedical={canEditMedical} />
    </ProtectedRoute>
  );
}
