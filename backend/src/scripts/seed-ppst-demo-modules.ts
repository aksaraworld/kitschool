/**
 * Seed demo BK, buku tamu, and LMS only — does NOT reset Auth/users.
 *
 * Usage:
 *   cd backend && npm run seed:demo-modules
 *
 * Requires existing PPST school (run seed:kitschool first, or any school with students).
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

import { firestore } from '../config/firebase';
import { USERS_COLLECTION } from '../models/firestore/User';

const SCHOOL_ID = process.env.SEED_SCHOOL_ID || 'ppst-alum';
const DEMO_LMS_VIDEO_URL = 'https://www.youtube.com/watch?v=haQMVtwQYAw';

function isoAt(hour: number, minute = 0, dayOffset = 0): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + dayOffset);
  d.setUTCHours(hour, minute, 0, 0);
  return d.toISOString();
}

async function main() {
  if (!firestore) throw new Error('Firebase Admin not initialized.');

  const schoolRef = firestore.collection('schools').doc(SCHOOL_ID);
  const schoolSnap = await schoolRef.get();
  if (!schoolSnap.exists) {
    throw new Error(`School ${SCHOOL_ID} not found. Run npm run seed:kitschool first.`);
  }
  const schoolId = schoolSnap.id;

  await schoolRef.set(
    { modules: { boardingSchool: true, bkModule: true, lmsModule: true }, updatedAt: new Date() },
    { merge: true }
  );

  const classSnap = await firestore.collection('classes').where('schoolId', '==', schoolId).limit(1).get();
  if (classSnap.empty) throw new Error('No class found for school.');
  const mtsClass = classSnap.docs[0];
  const mtsClassId = mtsClass.id;

  const yearSnap = await firestore.collection('years').where('schoolId', '==', schoolId).where('isActive', '==', true).limit(1).get();
  const yearId = yearSnap.empty ? '2025-2026' : yearSnap.docs[0].id;

  const usersSnap = await firestore.collection(USERS_COLLECTION).where('schoolId', '==', schoolId).get();
  const byRole = (role: string) =>
    usersSnap.docs.find((d) => (d.data() as { role?: string }).role === role)?.id;

  const teacherId = byRole('homeroom_teacher') ?? byRole('teacher');
  const bkId = byRole('koordinator_bk_eskul');
  const securityId = byRole('security');
  const staffTuId = usersSnap.docs.find((d) => (d.data() as { email?: string }).email?.startsWith('tu@'))?.id;
  const staffId = byRole('staff');
  const principalId = byRole('principal');

  const students = usersSnap.docs.filter((d) => (d.data() as { role?: string }).role === 'student');
  if (students.length < 2) throw new Error('Need at least 2 students.');
  const student1 = students[0];
  const student2 = students[1];
  const student1Name = String((student1.data() as { name?: string }).name ?? 'Santri');
  const student2Name = String((student2.data() as { name?: string }).name ?? 'Santri');

  const parents = usersSnap.docs.filter((d) => (d.data() as { role?: string }).role === 'parent');
  const parent1 = parents[0]?.id;

  console.log('Seeding BK demo...');
  await firestore.collection('disciplineIncidents').doc('bk-sample-tardiness').set({
    schoolId,
    studentId: student1.id,
    studentName: student1Name,
    environment: 'school',
    violationType: 'tardiness',
    recordType: 'demerit',
    points: 10,
    location: 'Ruang Kelas',
    description: 'Terlambat 15 menit',
    occurredAt: new Date().toISOString(),
    reportedBy: teacherId ?? student1.id,
    reportedByName: 'Guru Wali Kelas',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  }, { merge: true });

  await firestore.collection('disciplineIncidents').doc('bk-sample-merit').set({
    schoolId,
    studentId: student2.id,
    studentName: student2Name,
    environment: 'school',
    violationType: 'good_deed',
    recordType: 'merit',
    points: 15,
    location: 'Musholla',
    description: 'Membantu membersihkan musholla',
    occurredAt: isoAt(7, 0, -1),
    reportedBy: bkId ?? teacherId ?? student2.id,
    reportedByName: 'Koordinator BK',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  }, { merge: true });

  await firestore.collection('disciplineStudentSummaries').doc(student1.id).set({
    schoolId,
    studentId: student1.id,
    studentName: student1Name,
    totalDemerit: 35,
    totalMerit: 0,
    netPoints: 35,
    updatedAt: new Date(),
  }, { merge: true });

  console.log('Seeding visitor logs...');
  const securityName = securityId
    ? String((usersSnap.docs.find((d) => d.id === securityId)?.data() as { name?: string })?.name ?? 'Satpam')
  : 'Satpam';

  await firestore.collection('visitorLogs').doc('visitor-today-parent').set({
    schoolId,
    visitorName: 'Bapak Suryadi',
    visitorPhone: '+62 812 3456 7890',
    visitorCategory: 'parent',
    purpose: 'Menjemput santri',
    visitTargetType: 'employee',
    visitTargetUserId: staffTuId ?? null,
    visitTargetName: 'Tata Usaha',
    transportType: 'vehicle',
    vehiclePlate: 'F 1234 AB',
    vehicleType: 'Mobil',
    vehicleColor: 'Hitam',
    status: 'active',
    checkInAt: isoAt(6, 30),
    recordedBy: securityId ?? staffId ?? teacherId ?? student1.id,
    recordedByName: securityName,
    createdAt: new Date(),
    updatedAt: new Date(),
  }, { merge: true });

  await firestore.collection('visitorLogs').doc('visitor-yesterday-vendor').set({
    schoolId,
    visitorName: 'PT Berkah Catering',
    visitorCategory: 'business',
    visitorOrganization: 'Berkah Catering',
    purpose: 'Pengiriman bahan makanan',
    visitTargetType: 'employee',
    visitTargetName: 'Administrasi Sekolah',
    transportType: 'vehicle',
    vehiclePlate: 'B 5678 CD',
    status: 'completed',
    checkInAt: isoAt(9, 0, -1),
    checkOutAt: isoAt(10, 15, -1),
    recordedBy: securityId ?? staffId ?? teacherId ?? student1.id,
    recordedByName: securityName,
    createdAt: new Date(),
    updatedAt: new Date(),
  }, { merge: true });

  console.log('Seeding LMS + weekly schedules...');
  const syllabusId = 'syllabus-fiqih-mts-vii-a';
  const courseFiqihId = 'course-fiqih-w16';
  const coursePaiId = 'course-pai-w01';
  const now = new Date();
  const jsDay = new Date().getDay();

  await firestore.collection('lmsSyllabus').doc(syllabusId).set({
    schoolId,
    teacherId: teacherId ?? student1.id,
    teacherName: 'Guru Fiqih',
    subjectName: 'Fiqih',
    classId: mtsClassId,
    className: (mtsClass.data() as { name?: string }).name ?? 'VII A',
    yearId,
    description: 'RPS Fiqih — demo LMS dengan video YouTube',
    totalWeeks: 16,
    isPublished: true,
    createdAt: now,
    updatedAt: now,
  }, { merge: true });

  for (let weekNumber = 1; weekNumber <= 16; weekNumber++) {
    const isW16 = weekNumber === 16;
    const isW1 = weekNumber === 1;
    await firestore.collection('lmsSyllabus').doc(syllabusId).collection('weeks').doc(`w${String(weekNumber).padStart(2, '0')}`).set({
      weekNumber,
      topic: isW16 ? 'Fikih Ibadah — Shalat' : isW1 ? 'Pengenalan Fiqih' : '',
      learningObjectives: isW16 ? 'Menjelaskan rukun dan syarat shalat' : '',
      referencedLmsCourseId: isW16 ? courseFiqihId : isW1 ? coursePaiId : null,
      updatedAt: now,
    }, { merge: true });
  }

  await firestore.collection('lmsCourses').doc(courseFiqihId).set({
    schoolId,
    syllabusId,
    weekNumber: 16,
    title: 'Fikih Ibadah — Shalat (Video Materi)',
    isPublished: true,
    teacherId: teacherId ?? null,
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
    title: 'Pengenalan — Video Pembuka',
    isPublished: true,
    createdAt: now,
    updatedAt: now,
  }, { merge: true });

  await firestore.collection('lmsCourses').doc(coursePaiId).collection('items').doc('item-video-pai').set({
    type: 'video',
    title: 'Video Pengantar',
    contentUrl: DEMO_LMS_VIDEO_URL,
    order: 0,
    createdAt: now,
  }, { merge: true });

  await firestore.collection('schedules').doc('mts-fiqi-today').set({
    schoolId,
    classId: mtsClassId,
    yearId,
    title: 'Fiqih Ibadah',
    subjectName: 'Fiqih Ibadah',
    type: 'weekly_lesson',
    dayOfWeek: jsDay,
    startTime: '08:00',
    endTime: '09:30',
    teacherId: teacherId ?? null,
    activeSyllabusId: syllabusId,
    isRecurring: true,
    isAllDay: false,
    createdAt: now,
    updatedAt: now,
  }, { merge: true });

  console.log('\n✅ Demo modules seeded for', schoolId);
  console.log('   Video:', DEMO_LMS_VIDEO_URL);
  console.log('   Today visitor log + LMS schedule for dayOfWeek=', jsDay);
  console.log('   Login student → dashboard → Mulai Belajar');
}

main().catch((e) => {
  console.error('❌', e?.message || e);
  process.exit(1);
});
