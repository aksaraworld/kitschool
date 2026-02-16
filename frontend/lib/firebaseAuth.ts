/**
 * Firebase Authentication Service
 * Replaces JWT-based auth with Firebase Auth
 */

'use client';

import { 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { auth } from './firebase';
import { User } from './types';
import api from './aksara-api';

export const AUTH_CHANGE_EVENT = 'cognifa-auth-changed';

function requireFirebaseAuth() {
  if (!auth) {
    throw new Error(
      'Firebase is not configured in this environment. Set NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_PROJECT_ID, etc. in your deployment env vars and reload.'
    );
  }
  return auth;
}

const emitAuthChange = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  }
};

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  idToken: string;
}

export const firebaseAuthService = {
  /**
   * Login with email and password
   */
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    try {
      const firebaseAuth = requireFirebaseAuth();
      const userCredential = await signInWithEmailAndPassword(
        firebaseAuth,
        credentials.email,
        credentials.password
      );

      const idToken = await userCredential.user.getIdToken();

      // Store token ASAP to avoid race conditions where `currentUser` isn't ready
      // when our API client asks for auth headers.
      if (typeof window !== 'undefined') {
        localStorage.setItem('idToken', idToken);
      }

      // Get user data from Firestore via API
      // NOTE: `api` (aksara-api adapter) already injects Authorization header
      // via `firebaseAuthService.getToken()`, so we don't pass headers here.
      const userData = await api.get<User>('/auth/me');

      // Store token and user data
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(userData));
        emitAuthChange();
      }

      return {
        user: userData,
        idToken
      };
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error.message || 'Login failed');
    }
  },

  /**
   * Register new user
   */
  register: async (credentials: LoginCredentials & { name: string; role: string; schoolId?: string }): Promise<AuthResponse> => {
    try {
      const firebaseAuth = requireFirebaseAuth();
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        firebaseAuth,
        credentials.email,
        credentials.password
      );

      // Update display name
      await updateProfile(userCredential.user, {
        displayName: credentials.name
      });

      // Register user in backend (creates Firestore document and sets custom claims)
      const response = await api.post('/auth/register', {
        email: credentials.email,
        password: credentials.password,
        name: credentials.name,
        role: credentials.role,
        schoolId: credentials.schoolId
      });

      // Login after registration
      return await firebaseAuthService.login({
        email: credentials.email,
        password: credentials.password
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      throw new Error(error.message || 'Registration failed');
    }
  },

  /**
   * Logout
   */
  logout: async () => {
    try {
      const firebaseAuth = requireFirebaseAuth();
      await signOut(firebaseAuth);
      
      if (typeof window !== 'undefined') {
        localStorage.removeItem('idToken');
        localStorage.removeItem('user');
        emitAuthChange();
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  },

  /**
   * Get current user from localStorage
   */
  getCurrentUser: (): User | null => {
    if (typeof window === 'undefined') return null;
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  },

  /**
   * Get current Firebase ID token
   */
  getToken: async (): Promise<string | null> => {
    try {
      if (!auth) return typeof window !== 'undefined' ? localStorage.getItem('idToken') : null;
      const currentUser = auth.currentUser;
      if (currentUser) {
        return await currentUser.getIdToken();
      }
      
      // Fallback to localStorage
      if (typeof window !== 'undefined') {
        return localStorage.getItem('idToken');
      }
      
      return null;
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated: (): boolean => {
    if (typeof window === 'undefined') return false;
    try {
      return !!localStorage.getItem('idToken') && !!localStorage.getItem('user');
    } catch (error) {
      return false;
    }
  },

  /**
   * Listen to auth state changes
   */
  onAuthStateChanged: (callback: (user: FirebaseUser | null) => void) => {
    if (!auth) return () => {};
    return onAuthStateChanged(auth, callback);
  },

  /**
   * Refresh token
   */
  refreshToken: async (): Promise<string | null> => {
    try {
      if (!auth) return null;
      const currentUser = auth.currentUser;
      if (currentUser) {
        const newToken = await currentUser.getIdToken(true); // Force refresh
        if (typeof window !== 'undefined') {
          localStorage.setItem('idToken', newToken);
        }
        return newToken;
      }
      return null;
    } catch (error) {
      console.error('Error refreshing token:', error);
      return null;
    }
  }
};
