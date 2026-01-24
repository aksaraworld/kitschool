/**
 * Copyright (c) 2025 Panji Tianda (panjitianda@gmail.com) - In behalf of Aksara Nirwana Tianda. All rights reserved.
 */

import { useEffect, useRef } from 'react';

/**
 * Hook to check if component is mounted
 * Useful for preventing state updates on unmounted components
 */
export function useMounted(): () => boolean {
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return () => mountedRef.current;
}


