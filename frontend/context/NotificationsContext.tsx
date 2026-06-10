'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import api from '@/lib/aksara-api';
import { NOTIFICATIONS_REFRESH_EVENT } from '@/lib/notifications-events';
import { showBrowserChatNotification } from '@/lib/show-fcm-notification';
import InAppToastStack from '@/components/Layout/InAppToastStack';
import type { AppNotification } from '@/lib/types';

type NotificationsResponse = {
  notifications: AppNotification[];
  unreadCount: number;
};

type NotificationsContextValue = {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  refresh: (force?: boolean) => Promise<void>;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

function notifyKey(n: AppNotification): string {
  return n.conversationId ? `chat:${n.conversationId}` : n.id;
}

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const startedRef = useRef(false);
  const initializedRef = useRef(false);
  const snapshotRef = useRef(new Map<string, string>());
  const refreshingRef = useRef(false);

  const processNewMessages = useCallback((nextNotifications: AppNotification[]) => {
    for (const n of nextNotifications) {
      const key = notifyKey(n);
      const prevAt = snapshotRef.current.get(key);
      const isNew = initializedRef.current && prevAt !== undefined && n.createdAt !== prevAt;
      const isFirstSeen = initializedRef.current && prevAt === undefined;

      if (isNew || isFirstSeen) {
        void showBrowserChatNotification(n.title, n.body, n.conversationId);
      }
      snapshotRef.current.set(key, n.createdAt);
    }
    if (!initializedRef.current) {
      initializedRef.current = true;
    }
  }, []);

  const refresh = useCallback(
    async (force = false) => {
      if (refreshingRef.current) return;
      refreshingRef.current = true;
      try {
        setLoading(true);
        const data = force
          ? await api.get<NotificationsResponse>('/notifications', { skipCache: true })
          : await api.getCached<NotificationsResponse>('/notifications');

        const nextNotifications = data.notifications ?? [];
        processNewMessages(nextNotifications);
        setNotifications(nextNotifications);
        setUnreadCount(data.unreadCount ?? 0);
      } catch {
        // silent
      } finally {
        setLoading(false);
        refreshingRef.current = false;
      }
    },
    [processNewMessages]
  );

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    refresh(false);

    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        refresh(false);
      }
    }, 30_000);

    const onRefresh = () => refresh(true);
    window.addEventListener(NOTIFICATIONS_REFRESH_EVENT, onRefresh);
    window.addEventListener('focus', onRefresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener(NOTIFICATIONS_REFRESH_EVENT, onRefresh);
      window.removeEventListener('focus', onRefresh);
    };
  }, [refresh]);

  return (
    <NotificationsContext.Provider value={{ notifications, unreadCount, loading, refresh }}>
      {children}
      <InAppToastStack />
    </NotificationsContext.Provider>
  );
}

export function useNotificationsContext() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error('useNotificationsContext must be used within NotificationsProvider');
  }
  return ctx;
}
