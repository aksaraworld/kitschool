/**
 * Set/ensure demo Firebase Auth users with known passwords.
 *
 * Why: Mongo->Firestore migration cannot migrate passwords, so demo creds from DEMO_ACCOUNTS.md
 * will fail unless you explicitly set Firebase Auth passwords.
 *
 * Usage:
 *   cd backend
 *   npm run demo:auth
 *
 * Optional env:
 *   DEMO_SCHOOL_ID=<firestore school doc id>   # required for non-saas roles if claims are enforced elsewhere
 */

import dotenv from 'dotenv';
dotenv.config();

import { firebaseAuth, firestore, setUserRole } from '../config/firebase';
import { USERS_COLLECTION } from '../models/firestore/User';

type DemoUser = {
  email: string;
  password: string;
  name: string;
  role: string;
  needsSchool: boolean;
};

const DEMO_USERS: DemoUser[] = [
  { email: 'saas@cognifa.com', password: 'saasadmin123', name: 'SaaS Admin', role: 'saas_admin', needsSchool: false },
  { email: 'principal@smkdemodepok.sch.id', password: 'principal123', name: 'Principal', role: 'principal', needsSchool: true },
  { email: 'staff1@smkdemodepok.sch.id', password: 'staff123', name: 'Staff 1', role: 'staff', needsSchool: true },
  { email: 'finance1@smkdemodepok.sch.id', password: 'finance123', name: 'Finance 1', role: 'finance', needsSchool: true },
  { email: 'teacher1@smkdemodepok.sch.id', password: 'teacher123', name: 'Teacher 1', role: 'teacher', needsSchool: true },
  { email: 's0001@smkdemodepok.sch.id', password: 'student123', name: 'Student 0001', role: 'student', needsSchool: true },
  { email: 'parent0001@smkdemodepok.sch.id', password: 'parent123', name: 'Parent 0001', role: 'parent', needsSchool: true },
];

async function resolveDemoSchoolId(): Promise<string | undefined> {
  const fromEnv = process.env.DEMO_SCHOOL_ID;
  if (fromEnv) return fromEnv;

  // Best-effort: pick the first school
  const snap = await firestore.collection('schools').limit(1).get();
  return snap.docs[0]?.id;
}

async function upsertAuthUser(u: DemoUser) {
  try {
    const existing = await firebaseAuth.getUserByEmail(u.email);
    await firebaseAuth.updateUser(existing.uid, {
      password: u.password,
      displayName: u.name,
      disabled: false,
    });
    return existing.uid;
  } catch (err: any) {
    if (err?.code !== 'auth/user-not-found') throw err;
  }

  const created = await firebaseAuth.createUser({
    email: u.email,
    password: u.password,
    displayName: u.name,
    disabled: false,
    emailVerified: true,
  });
  return created.uid;
}

async function main() {
  if (!firebaseAuth || !firestore) {
    throw new Error('Firebase Admin not initialized. Check backend/.env FIREBASE_* vars.');
  }

  const schoolId = await resolveDemoSchoolId();
  console.log(`Using schoolId: ${schoolId || '(none)'}`);

  for (const u of DEMO_USERS) {
    if (u.needsSchool && !schoolId) {
      throw new Error('No schoolId found. Set DEMO_SCHOOL_ID env var or create a school in Firestore.');
    }

    const uid = await upsertAuthUser(u);
    await setUserRole(uid, u.role, u.needsSchool ? schoolId : undefined);

    // Ensure Firestore user doc exists (minimal shape; merge avoids overwriting migrated profile)
    const firestoreDoc: Record<string, any> = {
      email: u.email,
      name: u.name,
      role: u.role,
      isActive: true,
      updatedAt: new Date(),
      createdAt: new Date(),
    };
    if (u.needsSchool) {
      firestoreDoc.schoolId = schoolId;
    }

    await firestore.collection(USERS_COLLECTION).doc(uid).set(
      firestoreDoc,
      { merge: true }
    );

    console.log(`✅ ${u.email} set (uid=${uid})`);
  }

  console.log('\nDone. You can login using DEMO_ACCOUNTS.md passwords.');
}

main().catch((e) => {
  console.error('❌ Failed:', e?.message || e);
  process.exit(1);
});

