'use client';

import './fcm-rejection-guard';
import type { Messaging } from 'firebase/messaging';

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
const SW_URL = '/firebase-messaging-sw.js';

let messagingInstance: Messaging | null = null;
let swRegistration: ServiceWorkerRegistration | null = null;
let fcmInitPromise: Promise<{ messaging: Messaging; token: string } | null> | null = null;

function isFcmRegistration(reg: ServiceWorkerRegistration | undefined | null): boolean {
  const script = reg?.active?.scriptURL ?? reg?.installing?.scriptURL ?? reg?.waiting?.scriptURL ?? '';
  return script.includes('firebase-messaging-sw.js');
}

async function waitForActiveWorker(registration: ServiceWorkerRegistration): Promise<ServiceWorkerRegistration> {
  if (registration.active?.state === 'activated') {
    return registration;
  }

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
      setTimeout(resolve, 12_000);
    });
  }

  const ready = await navigator.serviceWorker.ready;
  return ready;
}

/** Register or reuse FCM SW — never unregister existing workers (triggers deleteToken crash). */
async function registerFcmServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (swRegistration?.pushManager && isFcmRegistration(swRegistration)) {
    return swRegistration;
  }

  if (!('serviceWorker' in navigator)) {
    throw new Error('Service worker tidak didukung');
  }

  let registration = await navigator.serviceWorker.getRegistration('/');

  if (!isFcmRegistration(registration)) {
    registration = await navigator.serviceWorker.register(SW_URL, { scope: '/' });
  }

  if (registration!.waiting) {
    registration!.waiting.postMessage({ type: 'SKIP_WAITING' });
  }

  registration = await waitForActiveWorker(registration!);

  if (!registration.pushManager) {
    throw new Error('Push messaging tidak tersedia');
  }

  swRegistration = registration;
  return registration;
}

async function createMessagingInstance(): Promise<Messaging> {
  if (messagingInstance) return messagingInstance;

  // SW must be active before getMessaging() attaches listeners.
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
