/**
 * Seed Kitschool — PPST Al UM (Islamic school: MTs + MA)
 *
 * Usage:
 *   cd backend
 *   FIREBASE_PROJECT_ID=kitschool-b86dd \
 *   FIREBASE_SERVICE_ACCOUNT_PATH=../path/to/adminsdk.json \
 *   npm run seed:kitschool
 *
 * Optional: SEED_RESET=1  → wipe Auth + Firestore first
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

const SCHOOL_ID = process.env.SEED_SCHOOL_ID || 'ppst-alum';
const DOMAIN = 'ppst-alum.sch.id';
const DEFAULT_PASSWORD = 'ppst2025';

const FIRESTORE_COLLECTIONS = [
  'users', 'schools', 'years', 'majors', 'classes', 'attendance', 'schedules',
  'invoices', 'payments', 'communications', 'config', 'subjects', 'rooms',
  'feeStructures', 'exams', 'grades', 'assignments', 'submissions', 'resources',
  'boardingAreas', 'boardingRooms', 'boardingSchedules',
  'disciplineIncidents', 'counselingSessions', 'disciplineWarnings', 'disciplineStudentSummaries',
  'visitorLogs', 'lmsSyllabus', 'lmsCourses',
];

/** Demo LMS video — YouTube unlisted/embed (haQMVtwQYAw) */
const DEMO_LMS_VIDEO_URL = 'https://www.youtube.com/watch?v=haQMVtwQYAw';

function isoAt(hour: number, minute = 0, dayOffset = 0): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + dayOffset);
  d.setUTCHours(hour, minute, 0, 0);
  return d.toISOString();
}

async function deleteSubcollection(collectionName: string, docId: string, subName: string) {
  const ref = firestore.collection(collectionName).doc(docId).collection(subName);
  const BATCH = 500;
  let snapshot = await ref.limit(BATCH).get();
  while (!snapshot.empty) {
    const batch = firestore.batch();
    snapshot.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    snapshot = await ref.limit(BATCH).get();
  }
}

async function deleteLmsCourse(courseId: string) {
  await deleteSubcollection('lmsCourses', courseId, 'items');
  await firestore.collection('lmsCourses').doc(courseId).delete();
}

async function deleteLmsSyllabus(syllabusId: string) {
  await deleteSubcollection('lmsSyllabus', syllabusId, 'weeks');
  await firestore.collection('lmsSyllabus').doc(syllabusId).delete();
}

type SeedUser = {
  email: string;
  password: string;
  name: string;
  role: string;
  schoolId?: string;
  extra?: Record<string, unknown>;
};

const MTS_NAMES = [
  'Muhammad Rizki Pratama', 'Fatimah Azzahra', 'Abdullah Hakim', 'Aisyah Nurul Hidayah',
  'Ibrahim Fadillah', 'Khadijah Safitri', 'Yusuf Al-Mahdi', 'Zainab Muthmainnah',
  'Hasan Basri', 'Maryam Qonita',
];

const MA_NAMES = [
  'Ahmad Syauqi Ramadhan', 'Nurul Izzah', 'Fauzan Aditya', 'Siti Halimatus Sakdiyah',
  'Umar Faruq', 'Rahmah Diana', 'Ali Imron', 'Hafshah Batul',
  'Bilal Maulana', 'Safiyyah Putri',
];

const MA_MAJORS = [
  { code: 'IPA', name: 'IPA (Saintek)', count: 3 },
  { code: 'IPS', name: 'IPS (Soshum)', count: 3 },
  { code: 'BAHASA', name: 'Bahasa', count: 2 },
  { code: 'AGAMA', name: 'Agama', count: 2 },
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
  console.log(`  Deleted ${total} Auth users.`);
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
  if (deleted > 0) console.log(`  ${name}: ${deleted} docs`);
}

async function upsertAuthUser(email: string, password: string, name: string): Promise<string> {
  try {
    const existing = await firebaseAuth.getUserByEmail(email);
    await firebaseAuth.updateUser(existing.uid, { password, displayName: name, disabled: false });
    return existing.uid;
  } catch (err: unknown) {
    if ((err as { code?: string })?.code !== 'auth/user-not-found') throw err;
  }
  const created = await firebaseAuth.createUser({
    email,
    password,
    displayName: name,
    disabled: false,
    emailVerified: true,
  });
  return created.uid;
}

async function upsertUser(u: SeedUser): Promise<string> {
  const uid = await upsertAuthUser(u.email, u.password, u.name);
  await setUserRole(uid, u.role, u.schoolId);
  const doc: Record<string, unknown> = {
    email: u.email,
    name: u.name,
    role: u.role,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...u.extra,
  };
  if (u.schoolId) doc.schoolId = u.schoolId;
  await firestore.collection(USERS_COLLECTION).doc(uid).set(doc, { merge: true });
  return uid;
}

async function main() {
  if (!firebaseAuth || !firestore) {
    throw new Error('Firebase Admin not initialized. Set FIREBASE_PROJECT_ID + service account.');
  }

  if (process.env.SEED_RESET === '1') {
    console.log('1) Resetting Auth + Firestore...');
    await deleteAllAuthUsers();
    for (const id of ['course-fiqih-w16', 'course-pai-w01']) {
      try {
        await deleteLmsCourse(id);
      } catch {
        /* ignore */
      }
    }
    try {
      await deleteLmsSyllabus('syllabus-fiqih-mts-vii-a');
    } catch {
      /* ignore */
    }
    for (const name of FIRESTORE_COLLECTIONS) await deleteCollection(name);
  }

  console.log('2) Creating school PPST Al UM...');
  const schoolRef = firestore.collection('schools').doc(SCHOOL_ID);
  await schoolRef.set(
    {
      name: 'PPST Al UM',
      shortName: 'PPST Al UM',
      address: 'Jl. Sirnagalih II No.03, RT.01/RW.06, Loji',
      city: 'Kota Bogor',
      district: 'Kec. Bogor Barat',
      province: 'Jawa Barat',
      postalCode: '16117',
      phone: '+62 251 838 4200',
      email: `info@${DOMAIN}`,
      website: `https://${DOMAIN}`,
      principalName: 'Ust. Ahmad Fauzi, M.Pd.I',
      principalEmail: `kepsek.mts@${DOMAIN}`,
      establishedYear: 1998,
      description:
        'Pondok Pesantren Salafiyah Terpadu Al-Um — sekolah Islam terpadu dengan jenjang MTs dan MA di Loji, Bogor.',
      schoolType: 'islamic',
      jenjang: ['MTs', 'MA'],
      accreditation: 'A',
      logo: '/ppst-alum-logo.png',
      subdomain: 'al-um',
      customDomain: 'ppst-alum.sch.id',
      landingPage: {
        enabled: true,
        slug: 'ppst-alum',
        heroTitle: 'PPST Al UM',
        heroSubtitle:
          'Pondok Pesantren Salafiyah Terpadu — pendidikan Islam berkualitas jenjang MTs & MA di Loji, Bogor.',
        showContact: true,
        ctaTitle: 'Portal PPST Al UM',
        ctaSubtitle: 'Masuk untuk staf, guru, orang tua, dan santri yang sudah terdaftar.',
        publicChatEnabled: true,
      },
      modules: { boardingSchool: true, bkModule: true, lmsModule: true },
      boardingConfig: {
        phonePolicy: {
          restrictOnSchoolDays: true,
          roomCaptainCanHoldPhone: true,
        },
      },
      subscriptionStatus: 'active',
      subscriptionPlan: 'standard',
      isActive: true,
      bankAccount: {
        bankName: 'Bank Syariah Indonesia',
        accountNumber: '7145678901',
        accountHolder: 'PPST Al UM',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    { merge: true }
  );
  const schoolId = schoolRef.id;

  console.log('3) Creating academic year...');
  const yearRef = firestore.collection('years').doc('2025-2026');
  await yearRef.set(
    {
      schoolId,
      name: '2025/2026',
      startDate: new Date('2025-07-01'),
      endDate: new Date('2026-06-30'),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    { merge: true }
  );

  console.log('4) Creating MA majors (IPA, IPS, Bahasa, Agama)...');
  const majorIds: Record<string, string> = {};
  for (const m of MA_MAJORS) {
    const ref = firestore.collection('majors').doc(`ma-${m.code.toLowerCase()}`);
    majorIds[m.code] = ref.id;
    await ref.set(
      {
        schoolId,
        code: m.code,
        name: m.name,
        level: 'MA',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      { merge: true }
    );
  }

  console.log('5) Creating users...');
  const ids: Record<string, string> = {};

  ids.admin = await upsertUser({
    email: 'admin@kitshool.com',
    password: 'kitschool2025',
    name: 'Kitschool Admin',
    role: 'saas_admin',
  });

  ids.ketuaYayasan = await upsertUser({
    email: `ketua.yayasan@${DOMAIN}`,
    password: DEFAULT_PASSWORD,
    name: 'H. Abdul Rahman, Lc.',
    role: 'ketua_yayasan',
    schoolId,
    extra: { phone: '+62 812 9000 0000' },
  });

  ids.ketuaPesantren = await upsertUser({
    email: `ketua.pesantren@${DOMAIN}`,
    password: DEFAULT_PASSWORD,
    name: 'Ust. Yusuf Ma\'sum, M.Ag.',
    role: 'ketua_pesantren',
    schoolId,
    extra: { phone: '+62 812 9000 0002' },
  });

  ids.principalMts = await upsertUser({
    email: `kepsek.mts@${DOMAIN}`,
    password: DEFAULT_PASSWORD,
    name: 'Ust. Ahmad Fauzi, M.Pd.I',
    role: 'principal',
    schoolId,
    extra: { nip: '196805151990031002', phone: '+62 812 9000 0001', unitId: 'mts', unitLabel: 'MTs' },
  });

  ids.principalMa = await upsertUser({
    email: `kepsek.ma@${DOMAIN}`,
    password: DEFAULT_PASSWORD,
    name: 'Ust. Zainuddin, M.Pd.',
    role: 'principal',
    schoolId,
    extra: { nip: '197203101995031004', phone: '+62 812 9000 0003', unitId: 'ma', unitLabel: 'MA' },
  });

  ids.staff = await upsertUser({
    email: `staff@${DOMAIN}`,
    password: DEFAULT_PASSWORD,
    name: 'Budi Santoso',
    role: 'staff',
    schoolId,
    extra: { department: 'Administrasi Sekolah', nip: '198203102010011003' },
  });

  ids.staffTu = await upsertUser({
    email: `tu@${DOMAIN}`,
    password: DEFAULT_PASSWORD,
    name: 'Siti Aminah',
    role: 'staff',
    schoolId,
    extra: { department: 'Tata Usaha', nip: '198507202015012004' },
  });

  ids.security = await upsertUser({
    email: `sekuriti@${DOMAIN}`,
    password: DEFAULT_PASSWORD,
    name: 'Rudi Hartono',
    role: 'security',
    schoolId,
    extra: { department: 'Keamanan / Satpam', phone: '+62 812 9000 0099' },
  });

  ids.bkCoordinator = await upsertUser({
    email: `bk@${DOMAIN}`,
    password: DEFAULT_PASSWORD,
    name: 'Ust. Siti Nurhaliza, S.Pd.',
    role: 'koordinator_bk_eskul',
    schoolId,
    extra: { nip: '198512102010012006', department: 'Bimbingan Konseling' },
  });

  ids.wakasekKesiswaan = await upsertUser({
    email: `wakasek.kesiswaan@${DOMAIN}`,
    password: DEFAULT_PASSWORD,
    name: 'Ust. Hamid Abdullah, M.Pd.',
    role: 'wakasek_kesiswaan',
    schoolId,
    extra: { nip: '197805202005011007' },
  });

  ids.musyrifPutra = await upsertUser({
    email: `musyrif.putra@${DOMAIN}`,
    password: DEFAULT_PASSWORD,
    name: 'Ust. Fadhil Rahman',
    role: 'staff',
    schoolId,
    extra: { department: 'Musyrif Asrama Putra', boardingRoomHeadId: 'kamar-putra-a1' },
  });

  ids.musyrifPutri = await upsertUser({
    email: `musyrif.putri@${DOMAIN}`,
    password: DEFAULT_PASSWORD,
    name: 'Ustzh. Nur Aisyah',
    role: 'staff',
    schoolId,
    extra: { department: 'Musyrifah Asrama Putri', boardingRoomHeadId: 'kamar-putri-b1' },
  });

  await schoolRef.update({
    customerServiceStaffId: ids.staffTu,
    updatedAt: new Date(),
  });

  ids.teacher = await upsertUser({
    email: `guru@${DOMAIN}`,
    password: DEFAULT_PASSWORD,
    name: 'Ust. Muhammad Hidayat, S.Pd.I',
    role: 'homeroom_teacher',
    schoolId,
    extra: { nip: '198911152014041005', teacherId: '198911152014041005' },
  });

  const mtsStudentIds: string[] = [];
  const maStudentIds: string[] = [];
  const parentIds: string[] = [];

  for (let i = 0; i < 10; i++) {
    const n = String(i + 1).padStart(2, '0');
    const studentEmail = `mts${n}@${DOMAIN}`;
    const parentEmail = `ortu-mts${n}@${DOMAIN}`;
    const studentName = MTS_NAMES[i];
    const parentName = `Orang Tua ${studentName.split(' ')[0]}`;

    const studentUid = await upsertUser({
      email: studentEmail,
      password: DEFAULT_PASSWORD,
      name: studentName,
      role: 'student',
      schoolId,
      extra: {
        nisn: `007${String(100000 + i).slice(-6)}`,
        admissionNo: `MTS${n}`,
        jenjang: 'MTs',
        gender: i % 2 === 0 ? 'L' : 'P',
      },
    });
    mtsStudentIds.push(studentUid);

    const parentUid = await upsertUser({
      email: parentEmail,
      password: DEFAULT_PASSWORD,
      name: parentName,
      role: 'parent',
      schoolId,
      extra: { children: [studentUid], phone: `+62 812 3456 ${String(100 + i).slice(-3)}` },
    });
    parentIds.push(parentUid);
  }

  let maIndex = 0;
  const maByMajor: Record<string, string[]> = {};
  for (const m of MA_MAJORS) {
    maByMajor[m.code] = [];
    for (let j = 0; j < m.count; j++) {
      const i = maIndex++;
      const n = String(i + 1).padStart(2, '0');
      const studentEmail = `ma${n}@${DOMAIN}`;
      const parentEmail = `ortu-ma${n}@${DOMAIN}`;
      const studentName = MA_NAMES[i];
      const parentName = `Orang Tua ${studentName.split(' ')[0]}`;

      const studentUid = await upsertUser({
        email: studentEmail,
        password: DEFAULT_PASSWORD,
        name: studentName,
        role: 'student',
        schoolId,
        extra: {
          nisn: `008${String(200000 + i).slice(-6)}`,
          admissionNo: `MA${n}`,
          jenjang: 'MA',
          major: m.code,
          gender: i % 2 === 0 ? 'L' : 'P',
        },
      });
      maStudentIds.push(studentUid);
      maByMajor[m.code].push(studentUid);

      const parentUid = await upsertUser({
        email: parentEmail,
        password: DEFAULT_PASSWORD,
        name: parentName,
        role: 'parent',
        schoolId,
        extra: { children: [studentUid], phone: `+62 813 4567 ${String(200 + i).slice(-3)}` },
      });
      parentIds.push(parentUid);
    }
  }

  console.log('6) Creating classes...');
  const mtsClassRef = firestore.collection('classes').doc('mts-vii-a');
  await mtsClassRef.set(
    {
      schoolId,
      yearId: yearRef.id,
      name: 'VII A',
      jenjang: 'MTs',
      level: 'VII',
      homeroomTeacherId: ids.teacher,
      studentIds: mtsStudentIds,
      capacity: 30,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    { merge: true }
  );

  const maClassIds: Record<string, string> = {};
  for (const m of MA_MAJORS) {
    const classRef = firestore.collection('classes').doc(`ma-x-${m.code.toLowerCase()}`);
    maClassIds[m.code] = classRef.id;
    await classRef.set(
      {
        schoolId,
        yearId: yearRef.id,
        majorId: majorIds[m.code],
        name: `X ${m.code}`,
        jenjang: 'MA',
        level: 'X',
        homeroomTeacherId: ids.teacher,
        studentIds: maByMajor[m.code],
        capacity: 30,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      { merge: true }
    );
  }

  for (let i = 0; i < mtsStudentIds.length; i++) {
    await firestore.collection(USERS_COLLECTION).doc(mtsStudentIds[i]).update({
      classId: mtsClassRef.id,
      updatedAt: new Date(),
    });
  }

  let maIdx = 0;
  for (const m of MA_MAJORS) {
    for (const uid of maByMajor[m.code]) {
      await firestore.collection(USERS_COLLECTION).doc(uid).update({
        classId: maClassIds[m.code],
        majorId: majorIds[m.code],
        updatedAt: new Date(),
      });
      maIdx++;
    }
  }

  await firestore.collection(USERS_COLLECTION).doc(ids.teacher).update({
    homeroomClassId: mtsClassRef.id,
    assignedClasses: [mtsClassRef.id, ...Object.values(maClassIds)],
    updatedAt: new Date(),
  });

  console.log('7) Seeding subjects, schedules, fees...');
  const subjectNames = [
    { code: 'PAI', name: 'Pendidikan Agama Islam' },
    { code: 'QH', name: "Al-Qur'an Hadits" },
    { code: 'FIQ', name: 'Fiqih' },
    { code: 'AKH', name: 'Akhlak' },
    { code: 'ARB', name: 'Bahasa Arab' },
    { code: 'BIN', name: 'Bahasa Indonesia' },
    { code: 'BIG', name: 'Bahasa Inggris' },
    { code: 'MAT', name: 'Matematika' },
    { code: 'IPA', name: 'Ilmu Pengetahuan Alam' },
    { code: 'IPS', name: 'Ilmu Pengetahuan Sosial' },
  ];
  const subjectIds: string[] = [];
  for (const s of subjectNames) {
    const ref = firestore.collection('subjects').doc(`${schoolId}-${s.code.toLowerCase()}`);
    subjectIds.push(ref.id);
    await ref.set(
      {
        schoolId,
        code: s.code,
        name: s.name,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      { merge: true }
    );
  }

  await firestore.collection('schedules').doc('mts-pai-1').set(
    {
      schoolId,
      classId: mtsClassRef.id,
      title: 'Pendidikan Agama Islam',
      type: 'lesson',
      startDate: new Date('2026-01-06T07:00:00'),
      endDate: new Date('2026-01-06T08:30:00'),
      room: 'Ruang VII A',
      createdBy: ids.teacher,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    { merge: true }
  );

  const fees = [
    {
      name: 'Iuran Pesantren & SPP Bulanan',
      amountBase: 900000,
      frequency: 'monthly',
      category: 'monthly_pesantren',
      productLine: 'pesantren',
      financeUnit: 'pesantren',
      description: 'Iuran bulanan pesantren termasuk SPP sekolah — berlaku semua santri MTs & MA',
    },
    {
      name: 'Iuran Tahunan',
      amountBase: 15000000,
      frequency: 'yearly',
      category: 'yearly',
      productLine: 'yayasan',
      financeUnit: 'yayasan',
      description: 'Iuran tahunan santri — dicatat di unit yayasan',
    },
    {
      name: 'Biaya Pendaftaran MTs',
      amountBase: 2000000,
      frequency: 'one_time',
      category: 'registration',
      productLine: 'mts',
      financeUnit: 'mts',
      description: 'Biaya pendaftaran siswa baru MTs',
    },
    {
      name: 'Biaya Pendaftaran MA',
      amountBase: 2500000,
      frequency: 'one_time',
      category: 'registration',
      productLine: 'ma',
      financeUnit: 'ma',
      description: 'Biaya pendaftaran siswa baru MA',
    },
    {
      name: 'Seragam & Perlengkapan MTs',
      amountBase: 1500000,
      frequency: 'one_time',
      category: 'other',
      productLine: 'mts',
      financeUnit: 'mts',
      description: 'Paket seragam dan perlengkapan siswa MTs',
    },
    {
      name: 'Seragam & Perlengkapan MA',
      amountBase: 1800000,
      frequency: 'one_time',
      category: 'other',
      productLine: 'ma',
      financeUnit: 'ma',
      description: 'Paket seragam dan perlengkapan siswa MA',
    },
  ];
  for (const f of fees) {
    const ref = firestore.collection('feeStructures').doc();
    await ref.set({
      schoolId,
      name: f.name,
      amountBase: f.amountBase,
      frequency: f.frequency,
      category: (f as { category?: string }).category ?? 'other',
      productLine: (f as { productLine?: string }).productLine ?? (f as { financeUnit?: string }).financeUnit ?? 'yayasan',
      financeUnit: (f as { financeUnit?: string }).financeUnit ?? 'yayasan',
      description: (f as { description?: string }).description ?? '',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  await firestore.collection('config').doc('subscriptionFeePerStudent').set(
    { key: 'subscriptionFeePerStudent', value: 45000, type: 'number', updatedAt: new Date() },
    { merge: true }
  );

  console.log('8) Updating school leadership & units (MTs + MA)...');
  await schoolRef.set(
    {
      units: [
        { id: 'mts', name: 'MTs', label: 'Madrasah Tsanawiyah', principalUserId: ids.principalMts, principalEmail: `kepsek.mts@${DOMAIN}` },
        { id: 'ma', name: 'MA', label: 'Madrasah Aliyah', principalUserId: ids.principalMa, principalEmail: `kepsek.ma@${DOMAIN}` },
      ],
      leadership: {
        ketuaPesantrenUserId: ids.ketuaPesantren,
        ketuaYayasanUserId: ids.ketuaYayasan,
      },
      updatedAt: new Date(),
    },
    { merge: true }
  );

  console.log('9) Seeding boarding module (asrama, kamar, jadwal malam)...');
  const areaPutra = firestore.collection('boardingAreas').doc('asrama-putra');
  const areaPutri = firestore.collection('boardingAreas').doc('asrama-putri');
  const areaMusholla = firestore.collection('boardingAreas').doc('musholla');
  const areaLapangan = firestore.collection('boardingAreas').doc('lapangan');
  const areaAula = firestore.collection('boardingAreas').doc('aula-kajian');

  await areaPutra.set({
    schoolId, name: 'Asrama Putra', gender: 'male', areaType: 'sleep',
    description: 'Blok asrama santri putra MTs & MA', isActive: true, createdAt: new Date(), updatedAt: new Date(),
  }, { merge: true });
  await areaPutri.set({
    schoolId, name: 'Asrama Putri', gender: 'female', areaType: 'sleep',
    description: 'Blok asrama santri putri MTs & MA', isActive: true, createdAt: new Date(), updatedAt: new Date(),
  }, { merge: true });
  await areaMusholla.set({
    schoolId, name: 'Musholla', areaType: 'programme',
    description: 'Shalat berjamaah & dzikir', isActive: true, createdAt: new Date(), updatedAt: new Date(),
  }, { merge: true });
  await areaLapangan.set({
    schoolId, name: 'Lapangan Olahraga', areaType: 'programme',
    description: 'Kegiatan olahraga & ekstrakurikuler', isActive: true, createdAt: new Date(), updatedAt: new Date(),
  }, { merge: true });
  await areaAula.set({
    schoolId, name: 'Aula Kajian', areaType: 'programme',
    description: 'Kajian malam & program non-akademik', isActive: true, createdAt: new Date(), updatedAt: new Date(),
  }, { merge: true });

  const mtsMale = mtsStudentIds.filter((_, i) => i % 2 === 0);
  const mtsFemale = mtsStudentIds.filter((_, i) => i % 2 === 1);
  const maMale = maStudentIds.filter((_, i) => i % 2 === 0);
  const maFemale = maStudentIds.filter((_, i) => i % 2 === 1);

  const putraStudents = [...mtsMale.slice(0, 3), ...maMale.slice(0, 3)];
  const putriStudents = [...mtsFemale.slice(0, 3), ...maFemale.slice(0, 3)];
  const putraCaptain = putraStudents[0];
  const putriCaptain = putriStudents[0];

  await firestore.collection('boardingRooms').doc('kamar-putra-a1').set({
    schoolId, areaId: areaPutra.id, name: 'A1', gender: 'male', capacity: 6,
    roomCaptainId: putraCaptain, studentIds: putraStudents,
    roomHeadStaffId: ids.musyrifPutra,
    floor: '1', isActive: true, createdAt: new Date(), updatedAt: new Date(),
  }, { merge: true });
  await firestore.collection('boardingRooms').doc('kamar-putri-b1').set({
    schoolId, areaId: areaPutri.id, name: 'B1', gender: 'female', capacity: 6,
    roomCaptainId: putriCaptain, studentIds: putriStudents,
    roomHeadStaffId: ids.musyrifPutri,
    floor: '1', isActive: true, createdAt: new Date(), updatedAt: new Date(),
  }, { merge: true });

  if (putraCaptain) {
    await firestore.collection(USERS_COLLECTION).doc(putraCaptain).set(
      { isRoomCaptain: true, canHoldPhone: true, boardingRoomId: 'kamar-putra-a1', updatedAt: new Date() },
      { merge: true }
    );
  }
  if (putriCaptain) {
    await firestore.collection(USERS_COLLECTION).doc(putriCaptain).set(
      { isRoomCaptain: true, canHoldPhone: true, boardingRoomId: 'kamar-putri-b1', updatedAt: new Date() },
      { merge: true }
    );
  }
  for (const sid of putraStudents) {
    if (sid === putraCaptain) continue;
    await firestore.collection(USERS_COLLECTION).doc(sid).set(
      { boardingRoomId: 'kamar-putra-a1', updatedAt: new Date() },
      { merge: true }
    );
  }
  for (const sid of putriStudents) {
    if (sid === putriCaptain) continue;
    await firestore.collection(USERS_COLLECTION).doc(sid).set(
      { boardingRoomId: 'kamar-putri-b1', updatedAt: new Date() },
      { merge: true }
    );
  }

  const eveningActivities = [
    { id: 'tadarus-sen', title: 'Tadarus Al-Qur\'an', activityType: 'tadarus', dayOfWeek: 1, startTime: '20:00', endTime: '21:00', areaId: areaMusholla.id },
    { id: 'tadarus-sel', title: 'Tadarus Al-Qur\'an', activityType: 'tadarus', dayOfWeek: 2, startTime: '20:00', endTime: '21:00', areaId: areaMusholla.id },
    { id: 'kajian-kam', title: 'Kajian Kitab Kuning', activityType: 'kajian', dayOfWeek: 4, startTime: '21:00', endTime: '22:00', areaId: areaAula.id },
    { id: 'dzikir-jum', title: 'Dzikir & Sholawat', activityType: 'dzikir', dayOfWeek: 5, startTime: '20:30', endTime: '21:30', areaId: areaMusholla.id },
    { id: 'olahraga-sab', title: 'Olahraga Santri', activityType: 'programme', dayOfWeek: 6, startTime: '16:00', endTime: '17:30', areaId: areaLapangan.id },
  ];
  for (const act of eveningActivities) {
    await firestore.collection('boardingSchedules').doc(act.id).set({
      schoolId,
      title: act.title,
      activityType: act.activityType,
      areaId: act.areaId,
      dayOfWeek: act.dayOfWeek,
      startTime: act.startTime,
      endTime: act.endTime,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }, { merge: true });
  }

  console.log('10) Seeding BK module (sample incidents & counseling)...');
  const sampleStudent = mtsStudentIds[0];
  const sampleParent = parentIds[0];
  const sampleStudentSnap = await firestore.collection(USERS_COLLECTION).doc(sampleStudent).get();
  const sampleStudentName = String((sampleStudentSnap.data() as { name?: string })?.name ?? 'Santri');

  const inc1 = firestore.collection('disciplineIncidents').doc('bk-sample-tardiness');
  await inc1.set({
    schoolId,
    studentId: sampleStudent,
    studentName: sampleStudentName,
    environment: 'school',
    violationType: 'tardiness',
    recordType: 'demerit',
    points: 10,
    location: 'Ruang VII A',
    description: 'Terlambat 15 menit',
    occurredAt: new Date().toISOString(),
    reportedBy: ids.teacher,
    reportedByName: 'Ust. Muhammad Hidayat, S.Pd.I',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const inc2 = firestore.collection('disciplineIncidents').doc('bk-sample-prayer');
  await inc2.set({
    schoolId,
    studentId: sampleStudent,
    studentName: sampleStudentName,
    environment: 'dormitory',
    violationType: 'skipping_prayer',
    recordType: 'demerit',
    points: 25,
    location: 'Musholla',
    description: 'Tidak hadir shalat isya berjamaah',
    occurredAt: new Date(Date.now() - 86400000).toISOString(),
    reportedBy: ids.musyrifPutra,
    reportedByName: 'Ust. Fadhil Rahman',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await firestore.collection('counselingSessions').doc('bk-sample-counsel').set({
    schoolId,
    studentId: sampleStudent,
    studentName: sampleStudentName,
    environment: 'dormitory',
    sessionAt: new Date().toISOString(),
    location: 'Ruang BK',
    counselorId: ids.bkCoordinator,
    counselorName: 'Ust. Siti Nurhaliza, S.Pd.',
    notes: 'Siswa mengakui begadang belajar; diberi motivasi dan jadwal tidur yang lebih teratur.',
    isPrivate: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await firestore.collection('disciplineWarnings').doc('bk-sample-warning-l1').set({
    schoolId,
    studentId: sampleStudent,
    studentName: sampleStudentName,
    parentId: sampleParent,
    level: 1,
    netPoints: 35,
    title: 'Pemberitahuan Perilaku',
    body: `Anak Anda ${sampleStudentName} mencatat pelanggaran. Total poin sanksi: 35. Mohon bimbingan di rumah.`,
    status: 'sent',
    triggeredByIncidentId: inc2.id,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await firestore.collection('disciplineStudentSummaries').doc(sampleStudent).set({
    schoolId,
    studentId: sampleStudent,
    studentName: sampleStudentName,
    totalDemerit: 35,
    totalMerit: 0,
    netPoints: 35,
    updatedAt: new Date(),
  });

  const sampleStudent2 = mtsStudentIds[1];
  const sampleStudent2Snap = await firestore.collection(USERS_COLLECTION).doc(sampleStudent2).get();
  const sampleStudent2Name = String((sampleStudent2Snap.data() as { name?: string })?.name ?? 'Santri');

  await firestore.collection('disciplineIncidents').doc('bk-sample-merit').set({
    schoolId,
    studentId: sampleStudent2,
    studentName: sampleStudent2Name,
    environment: 'school',
    violationType: 'good_deed',
    recordType: 'merit',
    points: 15,
    location: 'Halaman Sekolah',
    description: 'Membantu membersihkan musholla sebelum kajian',
    occurredAt: isoAt(7, 0, -2),
    reportedBy: ids.bkCoordinator,
    reportedByName: 'Ust. Siti Nurhaliza, S.Pd.',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await firestore.collection('disciplineStudentSummaries').doc(sampleStudent2).set({
    schoolId,
    studentId: sampleStudent2,
    studentName: sampleStudent2Name,
    totalDemerit: 0,
    totalMerit: 15,
    netPoints: -15,
    updatedAt: new Date(),
  });

  console.log('11) Seeding buku tamu (visitor logs)...');
  const securitySnap = await firestore.collection(USERS_COLLECTION).doc(ids.security).get();
  const securityName = String((securitySnap.data() as { name?: string })?.name ?? 'Satpam');

  await firestore.collection('visitorLogs').doc('visitor-today-parent').set({
    schoolId,
    visitorName: 'Bapak Suryadi',
    visitorPhone: '+62 812 3456 7890',
    visitorCategory: 'parent',
    visitorOrganization: null,
    purpose: 'Menjemput santri pulang libur',
    visitTargetType: 'employee',
    visitTargetUserId: ids.staffTu,
    visitTargetName: 'Siti Aminah (TU)',
    transportType: 'vehicle',
    vehiclePlate: 'F 1234 AB',
    vehicleType: 'Mobil',
    vehicleColor: 'Hitam',
    status: 'active',
    checkInAt: isoAt(6, 30),
    notes: 'Kartu identitas sudah diverifikasi',
    recordedBy: ids.security,
    recordedByName: securityName,
    createdAt: new Date(),
    updatedAt: new Date(),
  }, { merge: true });

  await firestore.collection('visitorLogs').doc('visitor-yesterday-vendor').set({
    schoolId,
    visitorName: 'PT Berkah Catering',
    visitorPhone: '+62 821 9999 1122',
    visitorCategory: 'business',
    visitorOrganization: 'Berkah Catering Bogor',
    purpose: 'Pengiriman bahan makanan asrama',
    visitTargetType: 'employee',
    visitTargetUserId: ids.staff,
    visitTargetName: 'Budi Santoso (Administrasi)',
    transportType: 'vehicle',
    vehiclePlate: 'B 5678 CD',
    vehicleType: 'Truk box',
    vehicleColor: 'Putih',
    status: 'completed',
    checkInAt: isoAt(9, 0, -1),
    checkOutAt: isoAt(10, 15, -1),
    recordedBy: ids.security,
    recordedByName: securityName,
    createdAt: new Date(),
    updatedAt: new Date(),
  }, { merge: true });

  await firestore.collection('visitorLogs').doc('visitor-official').set({
    schoolId,
    visitorName: 'Dinas Pendidikan Kota Bogor',
    visitorPhone: '+62 251 800 1234',
    visitorCategory: 'official',
    visitorOrganization: 'Dinas Pendidikan Kota Bogor',
    purpose: 'Monitoring program pesantren terpadu',
    visitTargetType: 'management',
    visitTargetUserId: ids.principalMts,
    visitTargetName: 'Ust. Ahmad Fauzi, M.Pd.I (Kepala MTs)',
    transportType: 'pedestrian',
    status: 'completed',
    checkInAt: isoAt(13, 0, -3),
    checkOutAt: isoAt(15, 30, -3),
    recordedBy: ids.security,
    recordedByName: securityName,
    createdAt: new Date(),
    updatedAt: new Date(),
  }, { merge: true });

  console.log('12) Seeding LMS (silabus Fiqih + jadwal mingguan + video demo)...');
  const fiqihSubject = subjectNames.find((s) => s.code === 'FIQ');
  const paiSubject = subjectNames.find((s) => s.code === 'PAI');
  const syllabusId = 'syllabus-fiqih-mts-vii-a';
  const courseFiqihId = 'course-fiqih-w16';
  const coursePaiId = 'course-pai-w01';
  const now = new Date();

  await firestore.collection('lmsSyllabus').doc(syllabusId).set({
    schoolId,
    teacherId: ids.teacher,
    teacherName: 'Ust. Muhammad Hidayat, S.Pd.I',
    subjectId: fiqihSubject ? `${schoolId}-fiq` : null,
    subjectName: 'Fiqih',
    classId: mtsClassRef.id,
    className: 'VII A',
    yearId: yearRef.id,
    description: 'RPS Fiqih MTs VII A — materi ibadah dan muamalah (demo LMS)',
    totalWeeks: 16,
    isPublished: true,
    createdAt: now,
    updatedAt: now,
  }, { merge: true });

  const weekTopics: Record<number, { topic: string; objectives: string; courseId?: string }> = {
    1: {
      topic: 'Pengenalan Fiqih & Istilah',
      objectives: 'Memahami definisi fiqih dan sumber hukum Islam',
      courseId: coursePaiId,
    },
    16: {
      topic: 'Fikih Ibadah — Shalat',
      objectives: 'Menjelaskan rukun, syarat, dan sifat shalat fardhu',
      courseId: courseFiqihId,
    },
  };

  for (let weekNumber = 1; weekNumber <= 16; weekNumber++) {
    const meta = weekTopics[weekNumber];
    await firestore.collection('lmsSyllabus').doc(syllabusId).collection('weeks').doc(`w${String(weekNumber).padStart(2, '0')}`).set({
      weekNumber,
      topic: meta?.topic ?? '',
      learningObjectives: meta?.objectives ?? '',
      referencedLmsCourseId: meta?.courseId ?? null,
      updatedAt: now,
    }, { merge: true });
  }

  await firestore.collection('lmsCourses').doc(courseFiqihId).set({
    schoolId,
    syllabusId,
    weekNumber: 16,
    title: 'Fikih Ibadah — Shalat (Video Materi)',
    isPublished: true,
    teacherId: ids.teacher,
    createdAt: now,
    updatedAt: now,
  }, { merge: true });

  await firestore.collection('lmsCourses').doc(courseFiqihId).collection('items').doc('item-video-shalat').set({
    type: 'video',
    title: 'Materi Video — Fikih Shalat',
    contentUrl: DEMO_LMS_VIDEO_URL,
    order: 0,
    createdAt: now,
  }, { merge: true });

  await firestore.collection('lmsCourses').doc(courseFiqihId).collection('items').doc('item-quiz-shalat').set({
    type: 'quiz',
    title: 'Kuis Bab Shalat',
    contentUrl: 'https://forms.gle/demo-kuis-shalat',
    order: 1,
    createdAt: now,
  }, { merge: true });

  await firestore.collection('lmsCourses').doc(coursePaiId).set({
    schoolId,
    syllabusId,
    weekNumber: 1,
    title: 'Pengenalan PAI — Video Pembuka',
    isPublished: true,
    teacherId: ids.teacher,
    createdAt: now,
    updatedAt: now,
  }, { merge: true });

  await firestore.collection('lmsCourses').doc(coursePaiId).collection('items').doc('item-video-pai').set({
    type: 'video',
    title: 'Video Pengantar Pendidikan Agama Islam',
    contentUrl: DEMO_LMS_VIDEO_URL,
    order: 0,
    createdAt: now,
  }, { merge: true });

  const jsDay = new Date().getDay();
  const weeklySlots = [
    { id: 'mts-fiqi-thu', subject: 'Fiqih', code: 'FIQ', day: 4, start: '07:00', end: '08:30', syllabus: syllabusId },
    { id: 'mts-pai-mon', subject: 'Pendidikan Agama Islam', code: 'PAI', day: 1, start: '07:00', end: '08:30', syllabus: syllabusId },
    { id: 'mts-qh-tue', subject: "Al-Qur'an Hadits", code: 'QH', day: 2, start: '08:30', end: '10:00', syllabus: null },
    { id: 'mts-arb-wed', subject: 'Bahasa Arab', code: 'ARB', day: 3, start: '10:15', end: '11:45', syllabus: null },
    { id: 'mts-fiqi-today', subject: 'Fiqih Ibadah', code: 'FIQ', day: jsDay, start: '08:00', end: '09:30', syllabus: syllabusId },
  ];

  for (const slot of weeklySlots) {
    await firestore.collection('schedules').doc(slot.id).set({
      schoolId,
      classId: mtsClassRef.id,
      yearId: yearRef.id,
      title: slot.subject,
      subjectName: slot.subject,
      type: 'weekly_lesson',
      dayOfWeek: slot.day,
      startTime: slot.start,
      endTime: slot.end,
      teacherId: ids.teacher,
      activeSyllabusId: slot.syllabus,
      room: 'Ruang VII A',
      isRecurring: true,
      isAllDay: false,
      createdBy: ids.teacher,
      createdAt: now,
      updatedAt: now,
    }, { merge: true });
  }

  console.log('\n✅ Kitschool PPST Al UM seed complete.');
  console.log(`   schoolId: ${schoolId}`);
  console.log(`   SaaS admin: admin@kitshool.com / kitschool2025`);
  console.log(`   School users password: ${DEFAULT_PASSWORD}`);
  console.log(`   MTs students: 10 | MA students: 10 | Parents: 20`);
  console.log(`   Staff: principal, staff, TU, BK, musyrif, security, 1 teacher (wali kelas)`);
  console.log(`   Landing: /school/ppst-alum`);
  console.log(`   Boarding: asrama putra/putri + jadwal tadarus/kajian`);
  console.log(`   BK: sample incidents + counseling + merit point`);
  console.log(`   Buku tamu: 3 visitor logs (termasuk kunjungan aktif hari ini)`);
  console.log(`   LMS: silabus Fiqih + video ${DEMO_LMS_VIDEO_URL}`);
  console.log(`   Jadwal LMS hari ini (dayOfWeek=${new Date().getDay()}): lihat dashboard santri mts01`);
  console.log(`   See KITSCHOOL_DEMO_ACCOUNTS.md`);
}

main().catch((e) => {
  console.error('❌', e?.message || e);
  process.exit(1);
});
