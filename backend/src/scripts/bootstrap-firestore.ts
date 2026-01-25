/**
 * Bootstrap Firestore + Firebase Auth
 *
 * Creates:
 * - 1 School document in Firestore (`schools` collection)
 * - Optional initial users in Firebase Auth + Firestore (`users` collection)
 *
 * Usage:
 *   cd backend
 *   npm run bootstrap:firebase
 *
 * Env (recommended):
 *   FIREBASE_PROJECT_ID=...
 *   FIREBASE_SERVICE_ACCOUNT_PATH=./<service-account>.json
 *
 * Optional env:
 *   BOOTSTRAP_SCHOOL_NAME="Cognifa Demo School"
 *   BOOTSTRAP_SCHOOL_ID="(optional fixed id)"
 *
 *   BOOTSTRAP_SAAS_ADMIN_EMAIL="admin@example.com"
 *   BOOTSTRAP_SAAS_ADMIN_PASSWORD="StrongPassword123!"
 *   BOOTSTRAP_SAAS_ADMIN_NAME="SaaS Admin"
 *
 *   BOOTSTRAP_PRINCIPAL_EMAIL="principal@example.com"
 *   BOOTSTRAP_PRINCIPAL_PASSWORD="StrongPassword123!"
 *   BOOTSTRAP_PRINCIPAL_NAME="Principal"
 */

import dotenv from 'dotenv';
dotenv.config();

import { firebaseAuth, firestore, setUserRole } from '../config/firebase';
import { USERS_COLLECTION } from '../models/firestore/User';

type UserRole = 'saas_admin' | 'principal';

async function upsertAuthUser(params: {
  email: string;
  password: string;
  name: string;
}): Promise<{ uid: string; email: string }> {
  const { email, password, name } = params;

  // Get-or-create user in Firebase Auth
  try {
    const existing = await firebaseAuth.getUserByEmail(email);
    // Keep displayName in sync (best-effort)
    if (existing.displayName !== name) {
      await firebaseAuth.updateUser(existing.uid, { displayName: name });
    }
    return { uid: existing.uid, email: existing.email || email };
  } catch (err: any) {
    if (err?.code !== 'auth/user-not-found') throw err;
  }

  const created = await firebaseAuth.createUser({
    email,
    password,
    displayName: name,
    disabled: false,
    emailVerified: false,
  });

  return { uid: created.uid, email: created.email || email };
}

async function upsertFirestoreUser(params: {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  schoolId?: string;
}) {
  const { uid, email, name, role, schoolId } = params;

  await firestore.collection(USERS_COLLECTION).doc(uid).set(
    {
      email,
      name,
      role,
      schoolId: role === 'saas_admin' ? undefined : schoolId,
      isActive: true,
      updatedAt: new Date(),
      // keep createdAt if doc exists
      createdAt: new Date(),
    },
    { merge: true }
  );
}

async function main() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error('FIREBASE_PROJECT_ID is required');
  }

  // 1) Create school doc
  const schoolName = process.env.BOOTSTRAP_SCHOOL_NAME || 'Cognifa School';
  const fixedSchoolId = process.env.BOOTSTRAP_SCHOOL_ID;

  const schoolsCol = firestore.collection('schools');
  const schoolRef = fixedSchoolId ? schoolsCol.doc(fixedSchoolId) : schoolsCol.doc();

  // Minimal fields used by `/api/auth/me` response
  await schoolRef.set(
    {
      name: schoolName,
      subscriptionStatus: 'trial',
      subscriptionPlan: 'trial',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    { merge: true }
  );

  console.log('✅ Bootstrapped Firestore school');
  console.log(`   schoolId: ${schoolRef.id}`);
  console.log(`   name: ${schoolName}`);

  // 2) Optional SaaS admin
  const saasEmail = process.env.BOOTSTRAP_SAAS_ADMIN_EMAIL;
  const saasPassword = process.env.BOOTSTRAP_SAAS_ADMIN_PASSWORD;
  const saasName = process.env.BOOTSTRAP_SAAS_ADMIN_NAME || 'SaaS Admin';

  if (saasEmail && saasPassword) {
    const saas = await upsertAuthUser({ email: saasEmail, password: saasPassword, name: saasName });
    await setUserRole(saas.uid, 'saas_admin');
    await upsertFirestoreUser({ uid: saas.uid, email: saas.email, name: saasName, role: 'saas_admin' });
    console.log('✅ Bootstrapped SaaS admin user');
    console.log(`   uid: ${saas.uid}`);
    console.log(`   email: ${saas.email}`);
  }

  // 3) Optional principal
  const principalEmail = process.env.BOOTSTRAP_PRINCIPAL_EMAIL;
  const principalPassword = process.env.BOOTSTRAP_PRINCIPAL_PASSWORD;
  const principalName = process.env.BOOTSTRAP_PRINCIPAL_NAME || 'Principal';

  if (principalEmail && principalPassword) {
    const principal = await upsertAuthUser({
      email: principalEmail,
      password: principalPassword,
      name: principalName,
    });
    await setUserRole(principal.uid, 'principal', schoolRef.id);
    await upsertFirestoreUser({
      uid: principal.uid,
      email: principal.email,
      name: principalName,
      role: 'principal',
      schoolId: schoolRef.id,
    });
    console.log('✅ Bootstrapped principal user');
    console.log(`   uid: ${principal.uid}`);
    console.log(`   email: ${principal.email}`);
    console.log(`   schoolId: ${schoolRef.id}`);
  }

  console.log('\nDone.');
}

main().catch((e) => {
  console.error('❌ Bootstrap failed:', e?.message || e);
  process.exit(1);
});

