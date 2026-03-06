'use client';

import { useAuth } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import ProfileView from '@/components/Profile/ProfileView';
import Link from 'next/link';
import { Shield } from 'lucide-react';

export default function ProfilePage() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <ProtectedRoute>
      <div className="space-y-4">
        <div className="flex items-center justify-end">
          <Link
            href="/profile/security"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-primary-600"
          >
            <Shield className="w-4 h-4" />
            Keamanan & data kontak
          </Link>
        </div>
        <ProfileView userId={user._id} isOwnProfile canEditMedical={false} />
      </div>
    </ProtectedRoute>
  );
}
