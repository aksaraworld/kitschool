'use client';

import type { Messaging } from 'firebase/messaging';

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
const SW_URL = '/firebase-messaging-sw.js';

let messagingInstance: Messaging | null = null;
let swRegistration: ServiceWorkerRegistration | null = null;
let fcmInitPromise: Promise<{ messaging: Messaging; token: string } | null> | null = null;
let rejectionHandlerInstalled = false;

function installPushManagerRejectionGuard() {
  if (rejectionHandlerInstalled || typeof window === 'undefined') return;
  rejectionHandlerInstalled = true;
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = reason instanceof Error ? reason.message : String(reason ?? '');
    if (msg.includes('pushManager')) {
      event.preventDefault();
    }
  });
}

async function waitForActiveWorker(registration: ServiceWorkerRegistration): Promise<void> {
  if (registration.active) return;

  const worker = registration.installing || registration.waiting;
  if (!worker) {
    await navigator.serviceWorker.ready;
    return;
  }

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
    setTimeout(resolve, 8000);
  });
}

async function registerFcmServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (swRegistration?.active?.scriptURL.includes('firebase-messaging-sw.js')) {
    return swRegistration;
  }

  if (!('serviceWorker' in navigator)) {
    throw new Error('Service worker tidak didukung');
  }

  installPushManagerRejectionGuard();

  let registration = await navigator.serviceWorker.getRegistration('/');
  if (!registration?.active?.scriptURL.includes('firebase-messaging-sw.js')) {
    registration = await navigator.serviceWorker.register(SW_URL, {
      scope: '/',
      updateViaCache: 'none',
    });
  }

  await waitForActiveWorker(registration);
  await navigator.serviceWorker.ready;

  if (!registration.pushManager) {
    throw new Error('Push messaging tidak tersedia');
  }

  swRegistration = registration;
  return registration;
}

async function createMessagingInstance(): Promise<Messaging> {
  const registration = await registerFcmServiceWorker();

  const { getMessaging, isSupported } = await import('firebase/messaging');
  const { app } = await import('@/lib/firebase');
  if (!app) throw new Error('Firebase belum siap');

  const supported = await isSupported();
  if (!supported) throw new Error('FCM tidak didukung di browser ini');

  // SW must be active before getMessaging() — otherwise Firebase attaches to a stale controller.
  if (!registration.active) {
    await navigator.serviceWorker.ready;
  }

  messagingInstance = getMessaging(app);
  return messagingInstance;
}

/** Single entry: register SW → getMessaging → getToken */
export async function initFcmClient(): Promise<{ messaging: Messaging; token: string } | null> {
  if (!VAPID_KEY) return null;
  if (fcmInitPromise) return fcmInitPromise;

  fcmInitPromise = (async () => {
    const registration = await registerFcmServiceWorker();
    const messaging = messagingInstance ?? (await createMessagingInstance());
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

export async function getFcmMessaging(): Promise<Messaging> {
  if (messagingInstance) return messagingInstance;
  return createMessagingInstance();
}
