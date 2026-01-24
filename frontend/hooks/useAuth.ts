'use client';

import { useState, useEffect, useRef } from 'react';
import { firebaseAuthService, AUTH_CHANGE_EVENT } from '@/lib/firebaseAuth';
import { User } from '@/lib/types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    
    // Get user on client side only
    const currentUser = firebaseAuthService.getCurrentUser();
    if (mountedRef.current) {
      setUser(currentUser);
      setIsLoading(false);
    }

    // Listen to Firebase Auth state changes
    const unsubscribe = firebaseAuthService.onAuthStateChanged((firebaseUser) => {
      if (mountedRef.current) {
        if (firebaseUser) {
          // User is signed in, get user data from Firestore
          firebaseAuthService.getToken().then(() => {
            const user = firebaseAuthService.getCurrentUser();
            setUser(user);
            setIsLoading(false);
          });
        } else {
          // User is signed out
          setUser(null);
          setIsLoading(false);
        }
      }
    });

    // Listen for custom auth change events
    const handleAuthChange = () => {
      if (mountedRef.current) {
        const currentUser = firebaseAuthService.getCurrentUser();
        setUser(currentUser);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener(AUTH_CHANGE_EVENT, handleAuthChange);
    }

    return () => {
      mountedRef.current = false;
      unsubscribe();
      if (typeof window !== 'undefined') {
        window.removeEventListener(AUTH_CHANGE_EVENT, handleAuthChange);
      }
    };
  }, []);

  return { user, isLoading, isAuthenticated: !!user };
}


