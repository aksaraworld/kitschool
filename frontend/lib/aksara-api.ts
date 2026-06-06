/**
 * Aksara API Client Adapter for Cognifa
 * Adapts @aksara/api to work with Firebase Auth and school context
 */

import { APIClient } from '@aksara/api';
import { firebaseAuthService } from './firebaseAuth';
import { getStoredSchoolId, getStoredUnitId } from './school-context-storage';

// In production, default to same-origin to avoid accidentally calling localhost.
// If your backend is deployed elsewhere, set NEXT_PUBLIC_API_URL to its origin (no trailing /api).
const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL || '';

// Create API client instance with Firebase Auth
export const aksaraApi = new APIClient({
  baseUrl: API_ORIGIN,
  apiPrefix: '/api',
  getAuthHeaders: async () => {
    const headers: Record<string, string> = {};
    
    // Add Firebase ID token
    const token = await firebaseAuthService.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Add school / unit context headers
    if (typeof window !== 'undefined') {
      const schoolId = getStoredSchoolId();
      if (schoolId) {
        headers['x-school-id'] = schoolId;
        const unitId = getStoredUnitId(schoolId);
        if (unitId) {
          headers['x-unit-id'] = unitId;
        }
      }
    }
    
    return headers;
  },
});

// Helper function to handle API responses with error handling
export async function handleApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    // Handle 401 Unauthorized - redirect to login
    if (response.status === 401) {
      if (typeof window !== 'undefined') {
        firebaseAuthService.logout();
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
      throw new Error('Unauthorized');
    }
    
    // Try to parse error message
    let errorMessage = 'An error occurred';
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
    } catch {
      errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    }
    
    throw new Error(errorMessage);
  }
  
  return response.json();
}

// Helper to build query string from params object
function buildQueryString(params: Record<string, any>): string {
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      queryParams.append(key, String(value));
    }
  });
  const queryString = queryParams.toString();
  return queryString ? `?${queryString}` : '';
}

// Convenience methods that return typed data
export const api = {
  get: async <T = any>(
    endpoint: string, 
    options?: { params?: Record<string, any>; skipCache?: boolean }
  ): Promise<T> => {
    const queryString = options?.params ? buildQueryString(options.params) : '';
    const response = await aksaraApi.get(`${endpoint}${queryString}`, { skipCache: options?.skipCache });
    return handleApiResponse<T>(response);
  },
  
  post: async <T = any>(endpoint: string, data?: any): Promise<T> => {
    const response = await aksaraApi.post(endpoint, data);
    return handleApiResponse<T>(response);
  },
  
  put: async <T = any>(endpoint: string, data?: any): Promise<T> => {
    const response = await aksaraApi.put(endpoint, data);
    return handleApiResponse<T>(response);
  },
  
  patch: async <T = any>(endpoint: string, data?: any): Promise<T> => {
    const response = await aksaraApi.patch(endpoint, data);
    return handleApiResponse<T>(response);
  },
  
  delete: async <T = any>(endpoint: string): Promise<T> => {
    const response = await aksaraApi.delete(endpoint);
    return handleApiResponse<T>(response);
  },
  
  getCached: async <T = any>(endpoint: string, options?: { skipCache?: boolean }): Promise<T> => {
    const response = await aksaraApi.getCached(endpoint, options);
    return handleApiResponse<T>(response);
  },
  
  invalidateCache: (pattern: string | RegExp) => aksaraApi.invalidateCache(pattern),
  clearCache: () => aksaraApi.clearCache(),
};

export default api;
