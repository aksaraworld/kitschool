/**
 * Server-only Firebase Admin for Next.js API routes (Vercel serverless).
 * Use only in Route Handlers or Server Components. Do not import in client code.
 *
 * Env (Vercel): FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 */

import {
  initializeFirebaseAdminFromEnv,
  getFirebaseAdminAuth,
  getFirebaseAdminDb,
} from '@aksara/firebase/admin';
import admin from 'firebase-admin';

let initDone = false;
function ensureInit() {
  if (initDone) return;
  const result = initializeFirebaseAdminFromEnv();
  if (!result.initialized && admin.apps.length === 0 && process.env.FIREBASE_PROJECT_ID) {
    admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID });
  }
  initDone = true;
}

export function getAuth() {
  ensureInit();
  return getFirebaseAdminAuth();
}

export function getFirestore() {
  ensureInit();
  return getFirebaseAdminDb();
}

export async function verifyIdToken(idToken: string): Promise<admin.auth.DecodedIdToken | null> {
  try {
    const auth = getAuth();
    return await auth.verifyIdToken(idToken);
  } catch {
    return null;
  }
}

export async function setUserRole(uid: string, role: string, schoolId?: string): Promise<void> {
  const auth = getAuth();
  const claims: Record<string, string> = { role };
  if (schoolId) claims.schoolId = schoolId;
  await auth.setCustomUserClaims(uid, claims);
}

const USERS_COLLECTION = 'users';

export function usersCollection() {
  return getFirestore().collection(USERS_COLLECTION);
}

export function schoolsCollection() {
  return getFirestore().collection('schools');
}

export function classesCollection() {
  return getFirestore().collection('classes');
}

export function yearsCollection() {
  return getFirestore().collection('years');
}

export function majorsCollection() {
  return getFirestore().collection('majors');
}

export function schedulesCollection() {
  return getFirestore().collection('schedules');
}

export function attendanceCollection() {
  return getFirestore().collection('attendance');
}

export function invoicesCollection() {
  return getFirestore().collection('invoices');
}

export function paymentsCollection() {
  return getFirestore().collection('payments');
}

export function communicationsCollection() {
  return getFirestore().collection('communications');
}

export function configCollection() {
  return getFirestore().collection('config');
}

export function paymentAttemptsCollection() {
  return getFirestore().collection('paymentAttempts');
}

/** Convert Firestore doc to JSON (id, _id + data, timestamps to ISO string). */
export function docToJson(doc: { id: string; data: () => Record<string, unknown> }): Record<string, unknown> {
  const data = doc.data() ?? {};
  const out: Record<string, unknown> = { id: doc.id, _id: doc.id, ...data };
  for (const key of Object.keys(out)) {
    const v = out[key];
    if (v && typeof v === 'object' && 'toDate' in v && typeof (v as { toDate: () => Date }).toDate === 'function') {
      out[key] = (v as { toDate: () => Date }).toDate();
    }
  }
  return out;
}
