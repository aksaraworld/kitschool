import { Xendit } from 'xendit-node';

let client: Xendit | null = null;

export function getXenditClient(): Xendit {
  const secretKey = process.env.XENDIT_SECRET_KEY;
  if (!secretKey) {
    throw new Error('XENDIT_SECRET_KEY is not configured');
  }
  if (!client) {
    client = new Xendit({ secretKey });
  }
  return client;
}

export function getXenditCallbackToken(): string {
  const token = process.env.XENDIT_CALLBACK_TOKEN;
  if (!token) {
    throw new Error('XENDIT_CALLBACK_TOKEN is not configured');
  }
  return token;
}

export function getAppBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/^https?:\/\//, '')}`;
  }
  return 'http://localhost:3000';
}
