/**
 * Copyright (c) 2025 Panji Tianda (panjitianda@gmail.com) - In behalf of Aksara Nirwana Tianda. All rights reserved.
 */

import { VercelConfig, VercelCronJob, VercelHeader, VercelFunctionConfig } from './types';

/**
 * Generate Vercel configuration
 */
export function generateVercelConfig(config: VercelConfig): VercelConfig {
  return {
    buildCommand: config.buildCommand,
    outputDirectory: config.outputDirectory,
    installCommand: config.installCommand,
    framework: config.framework || 'nextjs',
    functions: config.functions,
    crons: config.crons || [],
    headers: config.headers || [],
    rewrites: config.rewrites,
    redirects: config.redirects
  };
}

/**
 * Add cron job to configuration
 */
export function addCronJob(
  config: VercelConfig,
  path: string,
  schedule: string
): VercelConfig {
  const cronJob: VercelCronJob = { path, schedule };
  return {
    ...config,
    crons: [...(config.crons || []), cronJob]
  };
}

/**
 * Add header to configuration
 */
export function addHeader(
  config: VercelConfig,
  source: string,
  headers: Array<{ key: string; value: string }>
): VercelConfig {
  const header: VercelHeader = { source, headers };
  return {
    ...config,
    headers: [...(config.headers || []), header]
  };
}

/**
 * Configure function settings
 */
export function configureFunction(
  config: VercelConfig,
  pattern: string,
  settings: {
    maxDuration?: number;
    memory?: number;
    regions?: string[];
  }
): VercelConfig {
  return {
    ...config,
    functions: {
      ...config.functions,
      [pattern]: settings
    }
  };
}

/**
 * Generate default Next.js Vercel configuration
 */
export function generateDefaultNextJSConfig(options: {
  buildCommand?: string;
  outputDirectory?: string;
  installCommand?: string;
  apiRoutes?: string[];
  cronJobs?: Array<{ path: string; schedule: string }>;
}): VercelConfig {
  const config: VercelConfig = {
    framework: 'nextjs',
    buildCommand: options.buildCommand || 'npm run build',
    outputDirectory: options.outputDirectory || '.next',
    installCommand: options.installCommand || 'npm install'
  };

  // Configure API routes
  if (options.apiRoutes && options.apiRoutes.length > 0) {
    config.functions = {};
    options.apiRoutes.forEach(route => {
      config.functions![route] = {
        maxDuration: 30
      };
    });
  }

  // Add cron jobs
  if (options.cronJobs && options.cronJobs.length > 0) {
    config.crons = options.cronJobs;
  }

  // Add service worker headers
  config.headers = [
    {
      source: '/sw.js',
      headers: [
        {
          key: 'Content-Type',
          value: 'application/javascript'
        },
        {
          key: 'Service-Worker-Allowed',
          value: '/'
        },
        {
          key: 'Cache-Control',
          value: 'no-cache, no-store, must-revalidate'
        }
      ]
    }
  ];

  return config;
}
