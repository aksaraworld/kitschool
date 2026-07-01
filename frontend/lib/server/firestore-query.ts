/** Shared list/query limits — keeps serverless handlers O(limit) not O(collection size). */
export const DEFAULT_LIST_LIMIT = 100;
export const MAX_LIST_LIMIT = 500;
export const RECENT_LIMIT = 50;
export const STUDENT_PICKER_LIMIT = 200;

export function parseLimit(raw: string | null, fallback = DEFAULT_LIST_LIMIT): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(Math.floor(n), MAX_LIST_LIMIT);
}

export function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function dayRangeIso(date: string): { start: string; end: string } {
  return {
    start: `${date}T00:00:00.000Z`,
    end: `${date}T23:59:59.999Z`,
  };
}
