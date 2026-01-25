import axios from 'axios';
import { authService } from './auth';

// Default to same-origin in production. If backend is external, set NEXT_PUBLIC_API_URL to its origin.
const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL || '';
const API_URL = API_ORIGIN ? `${API_ORIGIN}/api` : '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  // Only access localStorage on client side
  if (typeof window !== 'undefined') {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      const selectedSchoolId = localStorage.getItem('selectedSchoolId');
      if (selectedSchoolId) {
        config.headers['x-school-id'] = selectedSchoolId;
      }
    } catch (error) {
      console.error('Error getting token:', error);
    }
  }
  return config;
});

// Handle 401 Unauthorized - redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token invalid or expired - clear auth and redirect to login
      if (typeof window !== 'undefined') {
        authService.logout();
        // Only redirect if not already on login page
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;

