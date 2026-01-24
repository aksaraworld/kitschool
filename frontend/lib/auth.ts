import api from './aksara-api';
import { User } from './types';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// Check if we're on the client side
const isClient = typeof window !== 'undefined';
export const AUTH_CHANGE_EVENT = 'sekolahkita-auth-changed';

const emitAuthChange = () => {
  if (isClient) {
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  }
};

export const authService = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', credentials);
    if (response.token && isClient) {
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      emitAuthChange();
    }
    return response;
  },

  logout: () => {
    if (isClient) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      emitAuthChange();
    }
  },

  getCurrentUser: (): User | null => {
    if (!isClient) return null;
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  },

  getToken: (): string | null => {
    if (!isClient) return null;
    try {
      return localStorage.getItem('token');
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  },

  isAuthenticated: (): boolean => {
    if (!isClient) return false;
    try {
      return !!localStorage.getItem('token');
    } catch (error) {
      console.error('Error checking authentication:', error);
      return false;
    }
  },
};

