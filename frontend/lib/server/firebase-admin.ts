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

export function medicalRecordsCollection() {
  return getFirestore().collection('medicalRecords');
}

export function admissionsCollection() {
  return getFirestore().collection('admissions');
}

export function feeStructuresCollection() {
  return getFirestore().collection('feeStructures');
}

export function leaveRequestsCollection() {
  return getFirestore().collection('leaveRequests');
}

export function payrollLogsCollection() {
  return getFirestore().collection('payrollLogs');
}

export function subjectsCollection() {
  return getFirestore().collection('subjects');
}

export function roomsCollection() {
  return getFirestore().collection('rooms');
}

export function examsCollection() {
  return getFirestore().collection('exams');
}

export function gradesCollection() {
  return getFirestore().collection('grades');
}

export function assignmentsCollection() {
  return getFirestore().collection('assignments');
}

export function submissionsCollection() {
  return getFirestore().collection('submissions');
}

export function resourcesCollection() {
  return getFirestore().collection('resources');
}

export function roleDefinitionsCollection() {
  return getFirestore().collection('roleDefinitions');
}

export function scholarshipsCollection() {
  return getFirestore().collection('scholarships');
}

export function subjectCategoriesCollection() {
  return getFirestore().collection('subjectCategories');
}

export function gradingConfigsCollection() {
  return getFirestore().collection('gradingConfigs');
}

export function subjectGradingConfigsCollection() {
  return getFirestore().collection('subjectGradingConfigs');
}

export function gradeComponentsCollection() {
  return getFirestore().collection('gradeComponents');
}

export function cashFlowCollection() {
  return getFirestore().collection('cashFlow');
}

export function pendingProfileChangesCollection() {
  return getFirestore().collection('pendingProfileChanges');
}

export function boardingAreasCollection() {
  return getFirestore().collection('boardingAreas');
}

export function boardingRoomsCollection() {
  return getFirestore().collection('boardingRooms');
}

export function boardingSchedulesCollection() {
  return getFirestore().collection('boardingSchedules');
}

export function tkDevelopmentAreasCollection() {
  return getFirestore().collection('tkDevelopmentAreas');
}

/** Convert Firestore doc to JSON (id, _id + data, timestamps to ISO string). Accepts Firestore DocumentSnapshot. */
export function docToJson(doc: { id: string; data: () => unknown }): Record<string, unknown> {
  const data = (doc.data() ?? {}) as Record<string, unknown>;
  const out: Record<string, unknown> = { id: doc.id, _id: doc.id, ...data };
  for (const key of Object.keys(out)) {
    const v = out[key];
    if (v && typeof v === 'object' && 'toDate' in v && typeof (v as { toDate: () => Date }).toDate === 'function') {
      out[key] = (v as { toDate: () => Date }).toDate();
    }
  }
  return out;
}
