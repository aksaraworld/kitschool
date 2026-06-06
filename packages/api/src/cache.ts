/**
 * Copyright (c) 2025 Panji Tianda (panjitianda@gmail.com) - In behalf of Aksara Nirwana Tianda. All rights reserved.
 */

import { CacheConfig } from './types';

interface CacheEntry {
  data: any;
  timestamp: number;
  expiresAt: number;
  endpoint: string;
}

/**
 * Get cache key from endpoint and params
 */
function getCacheKey(endpoint: string, params?: Record<string, any>): string {
  if (!params || Object.keys(params).length === 0) {
    return endpoint;
  }
  
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${JSON.stringify(params[key])}`)
    .join('&');
  
  return `${endpoint}?${sortedParams}`;
}

/**
 * API Cache Manager
 */
export class APICache {
  private memoryCache = new Map<string, CacheEntry>();
  private config: Required<CacheConfig>;
  private storagePrefix: string;
  private maxStorageSize: number;

  constructor(config: CacheConfig = {}) {
    this.config = {
      defaultDuration: config.defaultDuration ?? 5 * 60 * 1000, // 5 minutes
      staticDuration: config.staticDuration ?? 10 * 60 * 1000, // 10 minutes
      maxStorageSize: config.maxStorageSize ?? 5 * 1024 * 1024, // 5MB
      storagePrefix: config.storagePrefix ?? 'aksara_api_cache_',
    };
    this.storagePrefix = this.config.storagePrefix;
    this.maxStorageSize = this.config.maxStorageSize;
  }

  /**
   * Get cache duration based on endpoint
   */
  private getCacheDuration(endpoint: string): number {
    const staticEndpoints = [
      '/properties/',
      '/subscriptions/',
      '/plans',
      '/modules',
      '/schools',
      '/config',
      '/saas/summary',
      '/boarding/summary',
      '/dashboard/summary',
      '/public/school/',
    ];
    
    if (staticEndpoints.some(staticPath => endpoint.includes(staticPath))) {
      return this.config.staticDuration;
    }
    
    return this.config.defaultDuration;
  }

  /**
   * Get cached data
   */
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T | null> {
    const key = getCacheKey(endpoint, params);
    const now = Date.now();
    
    // Check memory cache first
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && now < memoryEntry.expiresAt) {
      return memoryEntry.data as T;
    }
    
    // Remove expired memory entry
    if (memoryEntry) {
      this.memoryCache.delete(key);
    }
    
    // Check localStorage
    try {
      const fullKey = `${this.storagePrefix}${key}`;
      const serialized = localStorage.getItem(fullKey);
      
      if (serialized) {
        const entry: CacheEntry = JSON.parse(serialized);
        
        // Check if expired
        if (now > entry.expiresAt) {
          localStorage.removeItem(fullKey);
          return null;
        }
        
        // Restore to memory cache
        this.memoryCache.set(key, entry);
        return entry.data as T;
      }
    } catch (err) {
      console.warn('Failed to load cache entry:', key, err);
    }
    
    return null;
  }

  /**
   * Set cache entry
   */
  async set(endpoint: string, data: any, params?: Record<string, any>, duration?: number): Promise<void> {
    const key = getCacheKey(endpoint, params);
    const now = Date.now();
    const cacheDuration = duration ?? this.getCacheDuration(endpoint);
    const expiresAt = now + cacheDuration;
    
    const entry: CacheEntry = {
      data,
      timestamp: now,
      expiresAt,
      endpoint
    };
    
    // Store in memory
    this.memoryCache.set(key, entry);
    
    // Persist to localStorage
    try {
      const fullKey = `${this.storagePrefix}${key}`;
      const serialized = JSON.stringify(entry);
      
      if (serialized.length > this.maxStorageSize) {
        console.warn('Cache entry too large, skipping persistence:', key);
        return;
      }
      
      localStorage.setItem(fullKey, serialized);
    } catch (err) {
      console.warn('Failed to persist cache entry:', key, err);
    }
  }

  /**
   * Invalidate cache for specific endpoint pattern
   */
  async invalidate(pattern: string | RegExp): Promise<void> {
    const keysToRemove: string[] = [];
    
    // Check memory cache
    for (const key of this.memoryCache.keys()) {
      if (typeof pattern === 'string' && key.includes(pattern)) {
        keysToRemove.push(key);
      } else if (pattern instanceof RegExp && pattern.test(key)) {
        keysToRemove.push(key);
      }
    }
    
    // Remove from memory
    keysToRemove.forEach(key => this.memoryCache.delete(key));
    
    // Remove from localStorage
    try {
      const keysToRemoveFromStorage: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.storagePrefix)) {
          const cacheKey = key.replace(this.storagePrefix, '');
          if (typeof pattern === 'string' && cacheKey.includes(pattern)) {
            keysToRemoveFromStorage.push(key);
          } else if (pattern instanceof RegExp && pattern.test(cacheKey)) {
            keysToRemoveFromStorage.push(key);
          }
        }
      }
      keysToRemoveFromStorage.forEach(key => localStorage.removeItem(key));
    } catch (err) {
      console.warn('Error invalidating cache:', err);
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    this.memoryCache.clear();
    
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.storagePrefix)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (err) {
      console.warn('Error clearing cache:', err);
    }
  }

  /**
   * Get cache stats
   */
  getStats() {
    return {
      memoryEntries: this.memoryCache.size,
      memoryKeys: Array.from(this.memoryCache.keys())
    };
  }
}


