'use client';

import { useParams } from 'next/navigation';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import { UserRole } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import ProfileView from '@/components/Profile/ProfileView';

export default function ProfileByIdPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const canViewOther =
    user?.role === UserRole.STAFF ||
    user?.role === UserRole.PRINCIPAL ||
    (user?.role === UserRole.PARENT && user?.children?.includes(id!));

  if (!canViewOther) {
    return (
      <ProtectedRoute>
        <div className="p-8 text-center text-red-600">Anda tidak memiliki akses untuk melihat profil ini.</div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <ProfileView userId={id!} isOwnProfile={user?._id === id} />
    </ProtectedRoute>
  );
}
