/**
 * Copyright (c) 2025 Panji Tianda (panjitianda@gmail.com) - In behalf of Aksara Nirwana Tianda. All rights reserved.
 */

/**
 * Cron schedule helpers
 */
export const CronSchedules = {
  /** Every minute */
  everyMinute: '* * * * *',
  /** Every hour */
  everyHour: '0 * * * *',
  /** Every day at midnight */
  daily: '0 0 * * *',
  /** Every day at 1 AM */
  daily1AM: '0 1 * * *',
  /** Every day at 2 AM */
  daily2AM: '0 2 * * *',
  /** Every day at 10 AM */
  daily10AM: '0 10 * * *',
  /** Every Monday at midnight */
  weekly: '0 0 * * 1',
  /** First day of month at midnight */
  monthly: '0 0 1 * *',
  /** First day of month at 1 AM */
  monthly1AM: '0 1 1 * *',
  /** First day of month at 10 AM */
  monthly10AM: '0 10 1 * *'
} as const;

/**
 * Create cron schedule
 * @param minute - Minute (0-59)
 * @param hour - Hour (0-23)
 * @param dayOfMonth - Day of month (1-31)
 * @param month - Month (1-12)
 * @param dayOfWeek - Day of week (0-7, 0 or 7 is Sunday)
 */
export function createCronSchedule(
  minute: number | string = '*',
  hour: number | string = '*',
  dayOfMonth: number | string = '*',
  month: number | string = '*',
  dayOfWeek: number | string = '*'
): string {
  return `${minute} ${hour} ${dayOfMonth} ${month} ${dayOfWeek}`;
}

/**
 * Validate cron schedule
 */
export function validateCronSchedule(schedule: string): boolean {
  const parts = schedule.trim().split(/\s+/);
  if (parts.length !== 5) {
    return false;
  }

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  // Validate each part
  const validators = [
    { part: minute, min: 0, max: 59, name: 'minute' },
    { part: hour, min: 0, max: 23, name: 'hour' },
    { part: dayOfMonth, min: 1, max: 31, name: 'dayOfMonth' },
    { part: month, min: 1, max: 12, name: 'month' },
    { part: dayOfWeek, min: 0, max: 7, name: 'dayOfWeek' }
  ];

  for (const { part, min, max, name } of validators) {
    if (part === '*') continue;
    
    const num = parseInt(part, 10);
    if (isNaN(num) || num < min || num > max) {
      return false;
    }
  }

  return true;
}
