/**
 * Copyright (c) 2025 Panji Tianda (panjitianda@gmail.com) - In behalf of Aksara Nirwana Tianda. All rights reserved.
 */

/**
 * API client configuration
 */
export interface APIClientConfig {
  baseUrl?: string;
  apiPrefix?: string;
  getAuthHeaders?: () => Promise<Record<string, string>> | Record<string, string>;
  isBundled?: () => boolean;
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  defaultDuration?: number;
  staticDuration?: number;
  maxStorageSize?: number;
  storagePrefix?: string;
}

/**
 * API request options
 */
export interface APIRequestOptions extends RequestInit {
  skipCache?: boolean;
  cacheDuration?: number;
}


