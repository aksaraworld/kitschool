/**
 * Copyright (c) 2025 Panji Tianda (panjitianda@gmail.com) - In behalf of Aksara Nirwana Tianda. All rights reserved.
 */

/**
 * Vercel cron job configuration
 */
export interface VercelCronJob {
  path: string;
  schedule: string; // Cron expression
}

/**
 * Vercel header configuration
 */
export interface VercelHeader {
  source: string;
  headers: Array<{
    key: string;
    value: string;
  }>;
}

/**
 * Vercel function configuration
 */
export interface VercelFunctionConfig {
  [pattern: string]: {
    maxDuration?: number;
    memory?: number;
    regions?: string[];
  };
}

/**
 * Vercel configuration
 */
export interface VercelConfig {
  buildCommand?: string;
  outputDirectory?: string;
  installCommand?: string;
  framework?: string;
  functions?: VercelFunctionConfig;
  crons?: VercelCronJob[];
  headers?: VercelHeader[];
  rewrites?: Array<{
    source: string;
    destination: string;
  }>;
  redirects?: Array<{
    source: string;
    destination: string;
    permanent?: boolean;
  }>;
}
