/**
 * Seed dummy data for new modules only (does NOT reset/delete existing data).
 * Use when you already have schools, users, classes and want to add demo content.
 *
 * Usage:
 *   cd backend && npx tsx src/scripts/seed-new-modules.ts
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

import { firestore } from '../config/firebase';
import { USERS_COLLECTION } from '../models/firestore/User';

async function seedNewModules() {
  if (!firestore) throw new Error('Firebase Admin not initialized. Set FIREBASE_* env.');

  const schoolsSnap = await firestore.collection('schools').limit(1).get();
  if (schoolsSnap.empty) {
    console.error('No school found. Run reset-and-seed-50.ts first.');
    process.exit(1);
  }
  const schoolId = schoolsSnap.docs[0].id;
  console.log('Using school:', schoolId);

  const usersSnap = await firestore.collection(USERS_COLLECTION).where('schoolId', '==', schoolId).get();
  const students = usersSnap.docs.filter((d) => (d.data() as { role?: string }).role === 'student');
  const teachers = usersSnap.docs.filter((d) => (d.data() as { role?: string }).role === 'teacher');
  const staff = usersSnap.docs.filter((d) => (d.data() as { role?: string }).role === 'staff');
  const studentIds = students.map((d) => d.id);
  const teacherIds = teachers.map((d) => d.id);
  const staffIds = staff.map((d) => d.id);

  const classesSnap = await firestore.collection('classes').where('schoolId', '==', schoolId).limit(5).get();
  const classIds = classesSnap.docs.map((d) => d.id);

  if (studentIds.length === 0 || classIds.length === 0) {
    console.error('Need at least 1 student and 1 class. Run reset-and-seed-50.ts first.');
    process.exit(1);
  }

  const teacher1 = teacherIds[0];
  const staff1 = staffIds[0];

  console.log('Seeding subjects...');
  const subjectIds: string[] = [];
  const subjects = [
    { name: 'Matematika', code: 'MAT' },
    { name: 'Bahasa Indonesia', code: 'BIN' },
    { name: 'Fisika', code: 'FIS' },
    { name: 'Kimia', code: 'KIM' },
  ];
  for (const s of subjects) {
    const ref = firestore.collection('subjects').doc();
    subjectIds.push(ref.id);
    await ref.set({
      schoolId,
      name: s.name,
      code: s.code,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  console.log('Seeding rooms...');
  const rooms = ['R. 101', 'R. 102', 'Lab Komputer', 'Aula'];
  for (const r of rooms) {
    await firestore.collection('rooms').doc().set({
      schoolId,
      name: r,
      capacity: r.startsWith('Lab') ? 24 : 36,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  console.log('Seeding medical records...');
  const bloodGroups = ['A+', 'B+', 'O+'];
  for (let i = 0; i < Math.min(5, studentIds.length); i++) {
    await firestore.collection('medicalRecords').doc().set({
      schoolId,
      studentId: studentIds[i],
      bloodGroup: bloodGroups[i % 3],
      allergies: i % 2 === 0 ? 'Debu' : null,
      emergencyPhone: '+62 812 3456 789' + i,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  console.log('Seeding admissions...');
  for (let i = 1; i <= 4; i++) {
    await firestore.collection('admissions').doc().set({
      schoolId,
      applicantName: `Calon Siswa Baru ${i}`,
      targetGrade: 'X TKJ',
      submissionDate: new Date(Date.now() - i * 86400000 * 5),
      status: i === 1 ? 'accepted' : i === 2 ? 'interview' : 'pending',
      reviewerId: i > 1 ? staff1 : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  console.log('Seeding fee structures...');
  const fees = [
    { name: 'SPP Bulanan', amountBase: 500000, frequency: 'monthly' },
    { name: 'Transport', amountBase: 200000, frequency: 'monthly' },
    { name: 'Lab', amountBase: 150000, frequency: 'termly' },
  ];
  for (const f of fees) {
    await firestore.collection('feeStructures').doc().set({
      schoolId,
      ...f,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  console.log('Seeding leave requests...');
  for (let i = 0; i < Math.min(3, staffIds.length); i++) {
    await firestore.collection('leaveRequests').doc().set({
      schoolId,
      staffId: staffIds[i],
      leaveType: i === 0 ? 'sick' : i === 1 ? 'vacation' : 'personal',
      status: i === 0 ? 'approved' : 'pending',
      startDate: new Date('2025-02-10'),
      endDate: new Date('2025-02-12'),
      reason: 'Demo leave',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  console.log('Seeding payroll logs...');
  const allStaff = [...staffIds, ...teacherIds].slice(0, 4);
  for (const sid of allStaff) {
    await firestore.collection('payrollLogs').doc().set({
      schoolId,
      staffId: sid,
      netPay: 4500000,
      disburseDate: new Date('2025-01-25'),
      periodStart: new Date('2025-01-01'),
      periodEnd: new Date('2025-01-31'),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  console.log('Seeding exams & grades...');
  const examRef = firestore.collection('exams').doc();
  await examRef.set({
    schoolId,
    title: 'UTS Matematika',
    subjectId: subjectIds[0],
    maxMarks: 100,
    weightage: 30,
    examDate: new Date('2025-03-15'),
    classId: classIds[0],
    academicYear: '2024/2025',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  for (let i = 0; i < Math.min(5, studentIds.length); i++) {
    await firestore.collection('grades').doc().set({
      schoolId,
      studentId: studentIds[i],
      examId: examRef.id,
      marksObtained: 70 + Math.floor(Math.random() * 25),
      teacherComments: 'Cukup baik',
      isPublished: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  console.log('Seeding assignments & submissions...');
  const assignRef = firestore.collection('assignments').doc();
  await assignRef.set({
    schoolId,
    classId: classIds[0],
    title: 'Tugas Matematika Bab 1',
    description: 'Kerjakan soal 1-10',
    dueDate: new Date(Date.now() + 7 * 86400000),
    createdBy: teacher1,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  for (let i = 0; i < Math.min(3, studentIds.length); i++) {
    await firestore.collection('submissions').doc().set({
      schoolId,
      assignmentId: assignRef.id,
      studentId: studentIds[i],
      submittedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  console.log('Seeding resources...');
  for (let i = 0; i < 4; i++) {
    await firestore.collection('resources').doc().set({
      schoolId,
      subjectId: subjectIds[i % subjectIds.length],
      type: i % 2 === 0 ? 'pdf' : 'video',
      title: `Materi ${subjects[i % subjects.length].name} - Modul ${i + 1}`,
      description: 'Bahan ajar demo',
      createdBy: teacher1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  console.log('\nDone. New modules seeded.');
}

seedNewModules().catch((e) => {
  console.error('❌', e?.message || e);
  process.exit(1);
});
