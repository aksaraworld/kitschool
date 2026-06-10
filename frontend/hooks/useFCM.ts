'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/aksara-api';
import { firebaseAuthService } from '@/lib/firebaseAuth';
import { dispatchNotificationsRefresh } from '@/lib/notifications-events';
import { initFcmClient } from '@/lib/fcm-client';
import { showForegroundNotification } from '@/lib/show-fcm-notification';

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

let fcmHookStarted = false;

export type NotificationStatus =
  | 'idle'
  | 'unsupported'
  | 'denied'
  | 'active'
  | 'error';

export function useFCM() {
  const [notificationStatus, setNotificationStatus] = useState<NotificationStatus>('idle');
  const [notificationMessage, setNotificationMessage] = useState<string | null>(null);

  useEffect(() => {
    if (fcmHookStarted || typeof window === 'undefined') return;
    fcmHookStarted = true;

    if (!('Notification' in window)) {
      setNotificationStatus('unsupported');
      setNotificationMessage('Browser tidak mendukung notifikasi push.');
      return;
    }

    if (!VAPID_KEY) {
      setNotificationStatus('error');
      setNotificationMessage('Notifikasi push belum dikonfigurasi (VAPID key).');
      return;
    }

    const user = firebaseAuthService.getCurrentUser();
    if (!user) {
      fcmHookStarted = false;
      return;
    }

    (async () => {
      try {
        if (Notification.permission === 'denied') {
          setNotificationStatus('denied');
          setNotificationMessage('Notifikasi diblokir. Aktifkan di pengaturan browser.');
          return;
        }

        const permission =
          Notification.permission === 'granted'
            ? 'granted'
            : await Notification.requestPermission();

        if (permission !== 'granted') {
          setNotificationStatus('denied');
          setNotificationMessage('Notifikasi tidak diizinkan. Chat tetap berfungsi tanpa push.');
          return;
        }

        const result = await initFcmClient();
        if (!result?.token) {
          setNotificationStatus('error');
          setNotificationMessage('Gagal mendapatkan token notifikasi.');
          return;
        }

        await api.post('/chat/fcm-token', { token: result.token });

        const { onMessage } = await import('firebase/messaging');
        onMessage(result.messaging, (payload) => {
          showForegroundNotification(payload);
          dispatchNotificationsRefresh();
        });

        setNotificationStatus('active');
        setNotificationMessage(null);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Gagal mendaftarkan notifikasi';
        setNotificationStatus('error');
        setNotificationMessage(`Notifikasi nonaktif: ${msg}. Chat tetap berfungsi.`);
        console.warn('FCM registration skipped:', e);
      }
    })();
  }, []);

  return { notificationStatus, notificationMessage };
}
