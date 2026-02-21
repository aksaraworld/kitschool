'use client';

import { useAuth } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import ProfileView from '@/components/Profile/ProfileView';

export default function ProfilePage() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <ProtectedRoute>
      <ProfileView userId={user._id} isOwnProfile canEditMedical={false} />
    </ProtectedRoute>
  );
}
