'use client';

import type { MessagePayload } from 'firebase/messaging';
import { showInAppToast } from '@/lib/in-app-notify';

export async function showBrowserChatNotification(
  title: string,
  body: string,
  conversationId?: string
) {
  if (typeof window === 'undefined' || Notification.permission !== 'granted') return;

  const href = conversationId ? `/messages?c=${conversationId}` : '/messages';
  const tag = `chat-${conversationId ?? 'new'}-${Date.now()}`;
  const options: NotificationOptions = {
    body,
    icon: '/kitschool-logo.png',
    tag,
    silent: false,
    data: { conversationId, type: 'chat' },
  };

  showInAppToast({ title, body, href });

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration('/');
      if (reg?.showNotification) {
        await reg.showNotification(title, options);
        return;
      }
    }
  } catch {
    // fall through
  }

  try {
    const n = new Notification(title, options);
    n.onclick = () => {
      window.focus();
      window.location.href = href;
      n.close();
    };
  } catch {
    // in-app toast already shown
  }
}

export function showForegroundNotification(payload: MessagePayload) {
  const title = payload.notification?.title ?? 'Pesan baru';
  const body = payload.notification?.body ?? '';
  const convId = payload.data?.conversationId;
  void showBrowserChatNotification(title, body, convId);
}
