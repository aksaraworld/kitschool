'use client';

import type { MessagePayload } from 'firebase/messaging';

export function showForegroundNotification(payload: MessagePayload) {
  if (typeof window === 'undefined' || Notification.permission !== 'granted') return;

  const title = payload.notification?.title ?? 'Pesan baru';
  const body = payload.notification?.body ?? '';
  const convId = payload.data?.conversationId;

  try {
    const n = new Notification(title, {
      body,
      icon: '/kitschool-logo.png',
      tag: convId ? `chat-${convId}` : 'chat',
      data: payload.data,
    });
    n.onclick = () => {
      window.focus();
      const href = convId ? `/messages?c=${convId}` : '/messages';
      window.location.href = href;
      n.close();
    };
  } catch {
    // ignore if Notification constructor fails
  }
}
