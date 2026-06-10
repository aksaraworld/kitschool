'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/aksara-api';
import { NOTIFICATIONS_REFRESH_EVENT } from '@/lib/notifications-events';
import type { AppNotification } from '@/lib/types';

type NotificationsResponse = {
  notifications: AppNotification[];
  unreadCount: number;
};

export function useNotifications(enabled = true) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      setLoading(true);
      const data = await api.get<NotificationsResponse>('/notifications', { skipCache: true });
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      // silent — header should not break on fetch failure
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    refresh();

    const interval = window.setInterval(refresh, 30_000);
    const onRefresh = () => refresh();
    window.addEventListener(NOTIFICATIONS_REFRESH_EVENT, onRefresh);
    window.addEventListener('focus', onRefresh);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener(NOTIFICATIONS_REFRESH_EVENT, onRefresh);
      window.removeEventListener('focus', onRefresh);
    };
  }, [enabled, refresh]);

  return { notifications, unreadCount, loading, refresh };
}
