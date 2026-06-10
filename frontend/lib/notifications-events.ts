export const NOTIFICATIONS_REFRESH_EVENT = 'app-notifications-refresh';

let refreshTimer: ReturnType<typeof setTimeout> | null = null;

/** Debounced refresh — avoids N API calls when chat fires many events. */
export function dispatchNotificationsRefresh() {
  if (typeof window === 'undefined') return;
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => {
    refreshTimer = null;
    window.dispatchEvent(new CustomEvent(NOTIFICATIONS_REFRESH_EVENT));
  }, 800);
}
