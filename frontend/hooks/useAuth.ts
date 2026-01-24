'use client';

import { useState, useEffect, useRef } from 'react';
import { authService, AUTH_CHANGE_EVENT } from '@/lib/auth';
import { User } from '@/lib/types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    
    // Get user on client side only
    const currentUser = authService.getCurrentUser();
    if (mountedRef.current) {
      setUser(currentUser);
      setIsLoading(false);
    }

    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Listen for auth changes
  useEffect(() => {
    const handleAuthChange = () => {
      if (mountedRef.current) {
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
  }, []);

  return { user, isLoading, isAuthenticated: !!user };
}


