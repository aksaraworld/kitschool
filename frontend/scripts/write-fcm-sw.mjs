/**
 * Writes public/firebase-messaging-sw.js from .env.local (or process env on Vercel).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendDir = path.join(__dirname, '..');
const envPath = path.join(frontendDir, '.env.local');

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return {};
  const out = {};
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

const fileEnv = loadEnvFile(envPath);
const env = { ...fileEnv, ...process.env };

const config = {
  apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '',
};

const body = `/* Auto-generated — do not edit. Run: node scripts/write-fcm-sw.mjs */
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');
firebase.initializeApp(${JSON.stringify(config)});
const messaging = firebase.messaging();
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'Pesan baru';
  self.registration.showNotification(title, {
    body: payload.notification?.body || '',
    icon: '/kitschool-logo.png',
    data: payload.data || {},
  });
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const convId = event.notification.data?.conversationId;
  event.waitUntil(clients.openWindow(convId ? '/messages?c=' + convId : '/messages'));
});
`;

const outPath = path.join(frontendDir, 'public', 'firebase-messaging-sw.js');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, body, 'utf8');
console.log('[write-fcm-sw] wrote', outPath, 'project:', config.projectId || '(empty)');
