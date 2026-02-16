import axios from 'axios';
import { firebaseAuthService } from './firebaseAuth';

// Default to same-origin in production. If backend is external, set NEXT_PUBLIC_API_URL to its origin.
const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL || '';
const API_URL = API_ORIGIN ? `${API_ORIGIN}/api` : '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests (async so we can use Firebase getToken())
api.interceptors.request.use(async (config) => {
  if (typeof window !== 'undefined') {
    try {
      const token = await firebaseAuthService.getToken();
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
      if (typeof window !== 'undefined') {
        firebaseAuthService.logout();
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

