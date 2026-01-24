/**
 * Copyright (c) 2025 Panji Tianda (panjitianda@gmail.com) - In behalf of Aksara Nirwana Tianda. All rights reserved.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface UseAsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

export interface UseAsyncOptions {
  immediate?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

/**
 * Generic async hook for handling async operations
 */
export function useAsync<T = any>(
  asyncFunction: () => Promise<T>,
  options: UseAsyncOptions = {}
): UseAsyncState<T> & { execute: () => Promise<void>; reset: () => void } {
  const { immediate = true, onSuccess, onError } = options;
  const [state, setState] = useState<UseAsyncState<T>>({
    data: null,
    loading: false,
    error: null,
  });
  const abortControllerRef = useRef<AbortController | null>(null);

  const execute = useCallback(async () => {
    // Cancel any ongoing requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const data = await asyncFunction();
      
      if (!abortControllerRef.current.signal.aborted) {
        setState({ data, loading: false, error: null });
        onSuccess?.(data);
      }
    } catch (error) {
      if (!abortControllerRef.current.signal.aborted) {
        const err = error instanceof Error ? error : new Error(String(error));
        setState(prev => ({ ...prev, loading: false, error: err }));
        onError?.(err);
      }
    }
  }, [asyncFunction, onSuccess, onError]);

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setState({ data: null, loading: false, error: null });
  }, []);

  useEffect(() => {
    if (immediate) {
      execute();
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [immediate, execute]);

  return { ...state, execute, reset };
}


