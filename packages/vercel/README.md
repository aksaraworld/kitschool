# @aksara/vercel

Vercel integration utilities for Aksara Framework with support for deployment configuration, cron jobs, and function settings.

## Features

- ✅ Vercel configuration generator
- ✅ Cron job configuration helpers
- ✅ Function settings configuration
- ✅ Header configuration
- ✅ Default Next.js setup

## Installation

```bash
npm install @aksara/vercel
```

## Usage

### Generate Vercel Configuration

```typescript
import { generateVercelConfig, generateDefaultNextJSConfig } from '@aksara/vercel';

// Default Next.js configuration
const config = generateDefaultNextJSConfig({
  buildCommand: 'npm run build',
  outputDirectory: '.next',
  apiRoutes: ['src/app/api/**/route.ts'],
  cronJobs: [
    { path: '/api/cron/daily-task', schedule: '0 0 * * *' }
  ]
});

// Custom configuration
const customConfig = generateVercelConfig({
  framework: 'nextjs',
  buildCommand: 'npm run build',
  outputDirectory: '.next',
  functions: {
    'src/app/api/**/route.ts': {
      maxDuration: 30
    }
  },
  crons: [
    { path: '/api/cron/task', schedule: '0 1 * * *' }
  ]
});
```

### Cron Jobs

```typescript
import { addCronJob, CronSchedules, createCronSchedule } from '@aksara/vercel';

// Using predefined schedules
const config = addCronJob(
  baseConfig,
  '/api/cron/daily',
  CronSchedules.daily
);

// Using custom schedule
const customSchedule = createCronSchedule(0, 10, 1, '*', '*'); // 10 AM on 1st of month
const configWithCustom = addCronJob(
  baseConfig,
  '/api/cron/monthly',
  customSchedule
);
```

### Headers

```typescript
import { addHeader } from '@aksara/vercel';

const config = addHeader(baseConfig, '/sw.js', [
  {
    key: 'Content-Type',
    value: 'application/javascript'
  },
  {
    key: 'Service-Worker-Allowed',
    value: '/'
  }
]);
```

### Function Configuration

```typescript
import { configureFunction } from '@aksara/vercel';

const config = configureFunction(baseConfig, 'src/app/api/**/route.ts', {
  maxDuration: 30,
  memory: 1024,
  regions: ['iad1']
});
```

## Cron Schedule Helpers

```typescript
import { CronSchedules } from '@aksara/vercel';

// Predefined schedules
CronSchedules.everyMinute    // '* * * * *'
CronSchedules.everyHour       // '0 * * * *'
CronSchedules.daily           // '0 0 * * *'
CronSchedules.daily1AM         // '0 1 * * *'
CronSchedules.daily10AM       // '0 10 * * *'
CronSchedules.weekly           // '0 0 * * 1'
CronSchedules.monthly          // '0 0 1 * *'
CronSchedules.monthly1AM        // '0 1 1 * *'
CronSchedules.monthly10AM      // '0 10 1 * *'
```

## Example: Complete Configuration

```typescript
import { 
  generateDefaultNextJSConfig,
  addCronJob,
  CronSchedules 
} from '@aksara/vercel';

const config = generateDefaultNextJSConfig({
  buildCommand: 'cd apps/web && npm run build',
  outputDirectory: 'apps/web/.next',
  apiRoutes: ['src/app/api/**/route.ts'],
  cronJobs: [
    { path: '/api/cron/daily-task', schedule: CronSchedules.daily },
    { path: '/api/cron/monthly-report', schedule: CronSchedules.monthly1AM }
  ]
});

// Export for vercel.json
export default config;
```

## Types

```typescript
interface VercelConfig {
  buildCommand?: string;
  outputDirectory?: string;
  installCommand?: string;
  framework?: string;
  functions?: VercelFunctionConfig;
  crons?: VercelCronJob[];
  headers?: VercelHeader[];
}

interface VercelCronJob {
  path: string;
  schedule: string; // Cron expression
}
```

## License

Proprietary - Copyright (c) 2025 Panji Tianda (panjitianda@gmail.com) - In behalf of Aksara Nirwana Tianda. All rights reserved.
