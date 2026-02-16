/**
 * Drop all Firestore data + Firebase Auth users, then seed exactly 50 demo accounts.
 * Serverless-friendly: run locally or in a one-off Node env with Firebase Admin credentials.
 *
 * Usage:
 *   cd backend && npx tsx src/scripts/reset-and-seed-50.ts
 *
 * Env: FIREBASE_PROJECT_ID, FIREBASE_SERVICE_ACCOUNT_PATH (or FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY)
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const envPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'backend', '.env'),
];
for (const p of envPaths) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    break;
  }
}

import { firebaseAuth, firestore, setUserRole } from '../config/firebase';
import { USERS_COLLECTION } from '../models/firestore/User';

const FIRESTORE_COLLECTIONS = [
  'users',
  'schools',
  'years',
  'majors',
  'classes',
  'attendance',
  'schedules',
  'invoices',
  'paymentAttempts',
  'payments',
  'communications',
  'config',
  'transactionFees',
  'studentActivities',
];

type DemoUser = {
  email: string;
  password: string;
  name: string;
  role: string;
  needsSchool: boolean;
};

// Exactly 50 demo accounts: 1 saas, 1 principal, 4 staff, 4 finance, 12 teachers, 15 students, 13 parents
const DEMO_50: DemoUser[] = [
  { email: 'saas@cognifa.com', password: 'saasadmin123', name: 'SaaS Admin', role: 'saas_admin', needsSchool: false },
  { email: 'principal@smkdemodepok.sch.id', password: 'principal123', name: 'Principal', role: 'principal', needsSchool: true },
  ...([1, 2, 3, 4].map((i) => ({ email: `staff${i}@smkdemodepok.sch.id`, password: 'staff123', name: `Staff ${i}`, role: 'staff', needsSchool: true }))),
  ...([1, 2, 3, 4].map((i) => ({ email: `finance${i}@smkdemodepok.sch.id`, password: 'finance123', name: `Finance ${i}`, role: 'finance', needsSchool: true }))),
  ...([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => ({ email: `teacher${i}@smkdemodepok.sch.id`, password: 'teacher123', name: `Teacher ${i}`, role: 'teacher', needsSchool: true }))),
  ...([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((i) => ({ email: `s${String(i).padStart(4, '0')}@smkdemodepok.sch.id`, password: 'student123', name: `Student ${i}`, role: 'student', needsSchool: true }))),
  ...([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map((i) => ({ email: `parent${String(i).padStart(4, '0')}@smkdemodepok.sch.id`, password: 'parent123', name: `Parent ${i}`, role: 'parent', needsSchool: true }))),
];

async function deleteAllAuthUsers() {
  let pageToken: string | undefined;
  let total = 0;
  do {
    const list = await firebaseAuth.listUsers(1000, pageToken);
    for (const u of list.users) {
      await firebaseAuth.deleteUser(u.uid);
      total++;
    }
    pageToken = list.pageToken;
  } while (pageToken);
  console.log(`  Deleted ${total} Firebase Auth users.`);
}

async function deleteCollection(name: string) {
  const col = firestore.collection(name);
  const BATCH = 500;
  let deleted = 0;
  let snapshot = await col.limit(BATCH).get();
  while (!snapshot.empty) {
    const batch = firestore.batch();
    snapshot.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    deleted += snapshot.size;
    snapshot = await col.limit(BATCH).get();
  }
  if (deleted > 0) console.log(`  ${name}: ${deleted} docs deleted.`);
}

async function seed50() {
  if (!firebaseAuth || !firestore) throw new Error('Firebase Admin not initialized. Set FIREBASE_* env.');

  console.log('1) Deleting all Firebase Auth users...');
  await deleteAllAuthUsers();

  console.log('2) Clearing Firestore collections...');
  for (const name of FIRESTORE_COLLECTIONS) await deleteCollection(name);

  console.log('3) Creating school with full profile, years, majors, classes...');
  const schoolRef = firestore.collection('schools').doc();
  const schoolId = schoolRef.id;

  await schoolRef.set({
    name: 'SMK Demo Depok',
    address: 'Jl. Pendidikan No. 1, Sawangan',
    city: 'Depok',
    province: 'Jawa Barat',
    postalCode: '16511',
    phone: '+62 21 12345678',
    email: 'info@smkdemodepok.sch.id',
    website: 'https://smkdemodepok.sch.id',
    principalName: 'Principal',
    principalEmail: 'principal@smkdemodepok.sch.id',
    principalPhone: '+62 21 12345678',
    establishedYear: 2010,
    description: 'Sekolah Menengah Kejuruan demo untuk platform Cognifa.',
    accreditation: 'A',
    subscriptionStatus: 'trial',
    subscriptionPlan: 'trial',
    isActive: true,
    bankAccount: {
      bankName: 'Bank Mandiri',
      accountNumber: '1370012345678',
      accountHolder: 'SMK Demo Depok',
    },
    taxId: '01.234.567.8-901.000',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const yearRef1 = firestore.collection('years').doc();
  await yearRef1.set({
    schoolId,
    name: '2024/2025',
    startDate: new Date('2024-07-01'),
    endDate: new Date('2025-06-30'),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const yearRef2 = firestore.collection('years').doc();
  await yearRef2.set({
    schoolId,
    name: '2023/2024',
    startDate: new Date('2023-07-01'),
    endDate: new Date('2024-06-30'),
    isActive: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const majorRef1 = firestore.collection('majors').doc();
  await majorRef1.set({
    schoolId,
    code: 'TKJ',
    name: 'Teknik Komputer Jaringan',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const majorRef2 = firestore.collection('majors').doc();
  await majorRef2.set({
    schoolId,
    code: 'MM',
    name: 'Multimedia',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const majorRef3 = firestore.collection('majors').doc();
  await majorRef3.set({
    schoolId,
    code: 'RPL',
    name: 'Rekayasa Perangkat Lunak',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log('4) Creating 50 demo users (Firebase Auth + Firestore)...');
  const userIds: { [key: string]: string } = {};
  for (const u of DEMO_50) {
    const created = await firebaseAuth.createUser({
      email: u.email,
      password: u.password,
      displayName: u.name,
      disabled: false,
      emailVerified: true,
    });
    await setUserRole(created.uid, u.role, u.needsSchool ? schoolId : undefined);
    const doc: Record<string, unknown> = {
      email: u.email,
      name: u.name,
      role: u.role,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    if (u.needsSchool) doc.schoolId = schoolId;
    await firestore.collection(USERS_COLLECTION).doc(created.uid).set(doc);
    userIds[u.email] = created.uid;
    console.log(`   ${u.email}`);
  }

  console.log('5) Creating classes with homeroom teachers and students...');
  const teacher1Uid = userIds['teacher1@smkdemodepok.sch.id'];
  const teacher2Uid = userIds['teacher2@smkdemodepok.sch.id'];
  const studentUids = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map(
    (i) => userIds[`s${String(i).padStart(4, '0')}@smkdemodepok.sch.id`]
  ).filter(Boolean);

  const classesToCreate = [
    { name: 'X TKJ 1', yearId: yearRef1.id, majorId: majorRef1.id, homeroomTeacherId: teacher1Uid, studentIds: studentUids.slice(0, 8) },
    { name: 'X TKJ 2', yearId: yearRef1.id, majorId: majorRef1.id, homeroomTeacherId: teacher2Uid, studentIds: studentUids.slice(8, 15) },
    { name: 'XI TKJ 1', yearId: yearRef1.id, majorId: majorRef1.id, homeroomTeacherId: teacher1Uid, studentIds: [] },
    { name: 'X MM 1', yearId: yearRef1.id, majorId: majorRef2.id, homeroomTeacherId: teacher2Uid, studentIds: [] },
    { name: 'X RPL 1', yearId: yearRef1.id, majorId: majorRef3.id, homeroomTeacherId: teacher1Uid, studentIds: [] },
  ];

  const classIds: string[] = [];
  for (const c of classesToCreate) {
    const classRef = firestore.collection('classes').doc();
    classIds.push(classRef.id);
    await classRef.set({
      schoolId,
      yearId: c.yearId,
      majorId: c.majorId,
      name: c.name,
      homeroomTeacherId: c.homeroomTeacherId || null,
      studentIds: c.studentIds || [],
      capacity: 36,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // Assign classId to students (first two classes get the 15 students)
  const classId1 = classIds[0];
  const classId2 = classIds[1];
  for (const uid of studentUids.slice(0, 8)) {
    await firestore.collection(USERS_COLLECTION).doc(uid).update({
      classId: classId1,
      updatedAt: new Date(),
    });
  }
  for (const uid of studentUids.slice(8, 15)) {
    await firestore.collection(USERS_COLLECTION).doc(uid).update({
      classId: classId2,
      updatedAt: new Date(),
    });
  }

  // Seed default config (SaaS)
  await firestore.collection('config').doc('subscriptionFeePerStudent').set(
    { key: 'subscriptionFeePerStudent', value: 50000, type: 'number', updatedAt: new Date() },
    { merge: true }
  );

  // Sample schedules for first class
  const scheduleRef1 = firestore.collection('schedules').doc();
  await scheduleRef1.set({
    schoolId,
    classId: classIds[0],
    title: 'Matematika',
    type: 'lesson',
    startDate: new Date('2025-01-20T07:00:00'),
    endDate: new Date('2025-01-20T08:30:00'),
    room: 'R. 101',
    createdBy: teacher1Uid,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const scheduleRef2 = firestore.collection('schedules').doc();
  await scheduleRef2.set({
    schoolId,
    classId: classIds[0],
    title: 'Bahasa Indonesia',
    type: 'lesson',
    startDate: new Date('2025-01-20T08:30:00'),
    endDate: new Date('2025-01-20T10:00:00'),
    room: 'R. 102',
    createdBy: teacher1Uid,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log('\nDone. 50 demo accounts + full school profile + 2 years, 3 majors, 5 classes + 2 sample schedules. See DEMO_ACCOUNTS.md for credentials.');
}

seed50().catch((e) => {
  console.error('❌', e?.message || e);
  process.exit(1);
});
