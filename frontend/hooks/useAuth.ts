'use client';

import { useState, useEffect } from 'react';
import { useMounted } from '@aksara/hooks';
import { authService, AUTH_CHANGE_EVENT } from '@/lib/auth';
import { User } from '@/lib/types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isMounted = useMounted();

  useEffect(() => {
    // Get user on client side only
    const currentUser = authService.getCurrentUser();
    if (isMounted()) {
      setUser(currentUser);
      setIsLoading(false);
    }
  }, [isMounted]);

  // Listen for auth changes
  useEffect(() => {
    const handleAuthChange = () => {
      if (isMounted()) {
        const currentUser = authService.getCurrentUser();
        setUser(currentUser);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener(AUTH_CHANGE_EVENT, handleAuthChange);
      return () => {
        window.removeEventListener(AUTH_CHANGE_EVENT, handleAuthChange);
      };
    }
  }, [isMounted]);

  return { user, isLoading, isAuthenticated: !!user };
}


