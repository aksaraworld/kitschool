export const NOTIFICATIONS_REFRESH_EVENT = 'app-notifications-refresh';

export function dispatchNotificationsRefresh() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(NOTIFICATIONS_REFRESH_EVENT));
  }
}
