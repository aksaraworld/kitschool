'use client';

import { useNotificationsContext } from '@/context/NotificationsContext';

/** @deprecated Prefer useNotificationsContext inside DashboardLayout */
export function useNotifications(enabled = true) {
  try {
    return useNotificationsContext();
  } catch {
    return {
      notifications: [],
      unreadCount: 0,
      loading: false,
      refresh: async () => {},
    };
  }
}
