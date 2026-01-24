/**
 * Copyright (c) 2025 Panji Tianda (panjitianda@gmail.com) - In behalf of Aksara Nirwana Tianda. All rights reserved.
 */

import { createContext, useContext, ReactNode } from 'react';

/**
 * Create a context with a custom hook that throws if used outside provider
 */
export function createContextWithHook<T>(
  displayName: string,
  errorMessage?: string
): [React.Context<T | undefined>, () => T] {
  const Context = createContext<T | undefined>(undefined);
  Context.displayName = displayName;

  const useHook = () => {
    const context = useContext(Context);
    if (context === undefined) {
      throw new Error(
        errorMessage || `${displayName} must be used within its Provider`
      );
    }
    return context;
  };

  return [Context, useHook];
}


