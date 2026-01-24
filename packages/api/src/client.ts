/**
 * Copyright (c) 2025 Panji Tianda (panjitianda@gmail.com) - In behalf of Aksara Nirwana Tianda. All rights reserved.
 */

import { APIClientConfig, APIRequestOptions } from './types';
import { APICache } from './cache';

/**
 * API Client with caching support
 */
export class APIClient {
  private config: Required<Pick<APIClientConfig, 'baseUrl' | 'apiPrefix'>> & {
    getAuthHeaders?: () => Promise<Record<string, string>> | Record<string, string>;
    isBundled?: () => boolean;
  };
  private cache: APICache;

  constructor(config: APIClientConfig = {}) {
    this.config = {
      baseUrl: config.baseUrl ?? '',
      apiPrefix: config.apiPrefix ?? '/api',
      getAuthHeaders: config.getAuthHeaders,
      isBundled: config.isBundled,
    };
    this.cache = new APICache();
  }

  /**
   * Get full API URL for an endpoint
   */
  private getApiUrl(endpoint: string): string {
    const baseUrl = this.config.baseUrl;
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
    const alreadyHasApi = cleanEndpoint.startsWith('api/');
    
    const normalizedEndpoint = alreadyHasApi 
      ? `/${cleanEndpoint}`
      : `${this.config.apiPrefix}/${cleanEndpoint}`;
    
    if (!baseUrl) {
      return normalizedEndpoint;
    }
    
    return `${baseUrl}${normalizedEndpoint}`;
  }

  /**
   * Check if running in bundled mode
   */
  private isBundled(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }
    
    if (this.config.isBundled) {
      return this.config.isBundled();
    }
    
    const protocol = window.location.protocol;
    return protocol === 'capacitor:' || protocol === 'file:';
  }

  /**
   * Get authenticated headers
   */
  private async getHeaders(options: APIRequestOptions = {}): Promise<Record<string, string>> {
    const headers: Record<string, string> = {};
    
    // Add auth headers
    if (this.config.getAuthHeaders) {
      const authHeaders = await this.config.getAuthHeaders();
      Object.assign(headers, authHeaders);
    }
    
    // Add existing headers
    if (options.headers && typeof options.headers === 'object') {
      Object.assign(headers, options.headers);
    }
    
    // Set Content-Type for non-FormData requests
    const isFormData = options.body instanceof FormData;
    if (!isFormData && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    
    return headers;
  }

  /**
   * Authenticated fetch
   */
  async fetch(endpoint: string, options: APIRequestOptions = {}): Promise<Response> {
    const fullUrl = this.getApiUrl(endpoint);
    const headers = await this.getHeaders(options);
    
    const response = await fetch(fullUrl, {
      ...options,
      headers,
    });
    
    return response;
  }

  /**
   * GET request
   */
  async get(endpoint: string, options: APIRequestOptions = {}): Promise<Response> {
    return this.fetch(endpoint, { ...options, method: 'GET' });
  }

  /**
   * POST request
   */
  async post(endpoint: string, data?: any, options: APIRequestOptions = {}): Promise<Response> {
    const isFormData = data instanceof FormData;
    return this.fetch(endpoint, {
      ...options,
      method: 'POST',
      body: data ? (isFormData ? data : JSON.stringify(data)) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put(endpoint: string, data?: any, options: APIRequestOptions = {}): Promise<Response> {
    const isFormData = data instanceof FormData;
    return this.fetch(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? (isFormData ? data : JSON.stringify(data)) : undefined,
    });
  }

  /**
   * PATCH request
   */
  async patch(endpoint: string, data?: any, options: APIRequestOptions = {}): Promise<Response> {
    return this.fetch(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete(endpoint: string, options: APIRequestOptions = {}): Promise<Response> {
    return this.fetch(endpoint, { ...options, method: 'DELETE' });
  }

  /**
   * Get cached data or fetch
   */
  async getCached(
    endpoint: string,
    options: APIRequestOptions = {}
  ): Promise<Response> {
    // Parse endpoint and query params
    const [path, queryString] = endpoint.split('?');
    const params: Record<string, any> = {};
    if (queryString) {
      queryString.split('&').forEach(param => {
        const [key, value] = param.split('=');
        if (key) {
          try {
            params[key] = decodeURIComponent(value || '');
          } catch {
            params[key] = value || '';
          }
        }
      });
    }

    // Skip cache if requested
    if (options.skipCache) {
      const response = await this.get(endpoint, options);
      if (response.ok) {
        const clonedResponse = response.clone();
        const data = await clonedResponse.json();
        await this.cache.set(path, data, Object.keys(params).length > 0 ? params : undefined);
      }
      return response;
    }

    // Check cache first
    const cacheParams = Object.keys(params).length > 0 ? params : undefined;
    const cached = await this.cache.get(path, cacheParams);
    if (cached) {
      return {
        ok: true,
        status: 200,
        json: async () => cached,
        text: async () => JSON.stringify(cached),
        headers: new Headers(),
        statusText: 'OK (Cached)',
        url: endpoint,
        redirected: false,
        type: 'default' as ResponseType,
        clone: () => ({ ...arguments } as any),
        body: null,
        bodyUsed: false,
        arrayBuffer: async () => new ArrayBuffer(0),
        blob: async () => new Blob(),
        formData: async () => new FormData()
      } as Response;
    }

    // Cache miss - fetch from API
    const response = await this.get(endpoint, options);
    if (response.ok) {
      const clonedResponse = response.clone();
      const data = await clonedResponse.json();
      await this.cache.set(path, data, cacheParams);
    }

    return response;
  }

  /**
   * Invalidate cache
   */
  async invalidateCache(pattern: string | RegExp): Promise<void> {
    await this.cache.invalidate(pattern);
  }

  /**
   * Clear all cache
   */
  async clearCache(): Promise<void> {
    await this.cache.clear();
  }

  /**
   * Get cache instance
   */
  getCache(): APICache {
    return this.cache;
  }
}


