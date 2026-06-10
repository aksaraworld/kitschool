'use client';

import type { Messaging } from 'firebase/messaging';

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
const SW_URL = '/firebase-messaging-sw.js';

let messagingInstance: Messaging | null = null;
let swRegistration: ServiceWorkerRegistration | null = null;
let fcmInitPromise: Promise<{ messaging: Messaging; token: string } | null> | null = null;
let swResetDone = false;

function installPushManagerRejectionGuard() {
  if (typeof window === 'undefined') return;
  const key = '__fcmRejectionGuard';
  if ((window as unknown as Record<string, boolean>)[key]) return;
  (window as unknown as Record<string, boolean>)[key] = true;

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const text =
      reason instanceof Error
        ? `${reason.message}\n${reason.stack ?? ''}`
        : String(reason ?? '');
    if (text.includes('pushManager') || text.includes('deleteTokenInternal')) {
      event.preventDefault();
    }
  });
}

async function waitForActiveWorker(registration: ServiceWorkerRegistration): Promise<void> {
  if (registration.active?.state === 'activated') return;

  const worker = registration.installing || registration.waiting;
  if (worker) {
    await new Promise<void>((resolve) => {
      if (worker.state === 'activated') {
        resolve();
        return;
      }
      const onState = () => {
        if (worker.state === 'activated') {
          worker.removeEventListener('statechange', onState);
          resolve();
        }
      };
      worker.addEventListener('statechange', onState);
      setTimeout(resolve, 10_000);
    });
  }

  await navigator.serviceWorker.ready;
}

/** One-time clean SW install — avoids stale controllers that break deleteToken. */
async function registerFcmServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (swRegistration?.active?.scriptURL.includes('firebase-messaging-sw.js')) {
    return swRegistration;
  }

  if (!('serviceWorker' in navigator)) {
    throw new Error('Service worker tidak didukung');
  }

  installPushManagerRejectionGuard();

  if (!swResetDone) {
    swResetDone = true;
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));
    await new Promise((r) => setTimeout(r, 300));
  }

  const registration = await navigator.serviceWorker.register(SW_URL, {
    scope: '/',
    updateViaCache: 'none',
  });

  if (registration.waiting) {
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }

  await waitForActiveWorker(registration);

  if (!registration.pushManager) {
    throw new Error('Push messaging tidak tersedia');
  }

  swRegistration = registration;
  return registration;
}

async function createMessagingInstance(): Promise<Messaging> {
  if (messagingInstance) return messagingInstance;

  await registerFcmServiceWorker();

  const { getMessaging, isSupported } = await import('firebase/messaging');
  const { app } = await import('@/lib/firebase');
  if (!app) throw new Error('Firebase belum siap');

  const supported = await isSupported();
  if (!supported) throw new Error('FCM tidak didukung di browser ini');

  messagingInstance = getMessaging(app);
  return messagingInstance;
}

export async function initFcmClient(): Promise<{ messaging: Messaging; token: string } | null> {
  if (!VAPID_KEY) return null;
  if (fcmInitPromise) return fcmInitPromise;

  fcmInitPromise = (async () => {
    const registration = await registerFcmServiceWorker();
    const messaging = await createMessagingInstance();
    const { getToken } = await import('firebase/messaging');

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (!token) return null;
    return { messaging, token };
  })().catch((err) => {
    fcmInitPromise = null;
    throw err;
  });

  return fcmInitPromise;
}
