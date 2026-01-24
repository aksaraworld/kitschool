'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/lib/auth';
import { UserRole } from '@/lib/types';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    if (authService.isAuthenticated()) {
      const currentUser = authService.getCurrentUser();
      if (currentUser?.role === UserRole.SAAS_ADMIN) {
        router.push('/saas/dashboard');
      } else {
        router.push('/dashboard');
      }
    } else {
      router.push('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
    </div>
  );
}

