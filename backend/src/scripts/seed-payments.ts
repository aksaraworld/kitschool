/**
 * Seed demo FinTech data so the finance UIs (parent hub, POS, treasury) have
 * something to render. Additive — does NOT reset existing data.
 *
 * Writes to the double-entry ledger collections used by the Next.js payment API:
 *   /invoices          — outstanding + settled bills
 *   /paymentAttempts   — Xendit gateway log (SUCCEEDED + one PENDING)
 *   /transactions      — immutable ledger rows (online, manual cash, refill, payout)
 *   /wallets           — school-system, student, and external virtual wallets
 *
 * Usage:
 *   cd backend && npx tsx src/scripts/seed-payments.ts
 *   # or: npm run seed:payments
 *
 * Env: FIREBASE_PROJECT_ID, FIREBASE_SERVICE_ACCOUNT_PATH
 *      (or FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY)
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

const EXTERNAL_XENDIT = 'EXTERNAL_XENDIT';
const EXTERNAL_CASH = 'EXTERNAL_CASH';
const EXTERNAL_BANK = 'EXTERNAL_BANK';
const schoolWalletId = (schoolId: string) => `SCHOOL_SYSTEM_${schoolId}`;
const studentWalletId = (id: string) => `STUDENT_${id}`;

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

async function seedPayments() {
  if (!firestore) throw new Error('Firebase Admin not initialized. Set FIREBASE_* env.');
  const db = firestore;

  const schoolsSnap = await db.collection('schools').limit(1).get();
  if (schoolsSnap.empty) {
    console.error('No school found. Run `npm run seed:firebase` first.');
    process.exit(1);
  }
  const schoolId = schoolsSnap.docs[0].id;
  console.log('Using school:', schoolId);

  const usersSnap = await db.collection(USERS_COLLECTION).where('schoolId', '==', schoolId).get();
  const students = usersSnap.docs.filter((d) => (d.data() as { role?: string }).role === 'student');
  const parents = usersSnap.docs.filter((d) => (d.data() as { role?: string }).role === 'parent');
  const staff = usersSnap.docs.filter((d) => {
    const role = (d.data() as { role?: string }).role;
    return role === 'staff' || role === 'finance';
  });

  if (students.length === 0) {
    console.error('Need at least 1 student. Run `npm run seed:firebase` first.');
    process.exit(1);
  }

  // Map studentId -> parentId (parents carry a `children` array; fall back to student.parentId)
  const parentOfStudent = new Map<string, string>();
  for (const p of parents) {
    const children = ((p.data() as { children?: string[] }).children ?? []) as string[];
    for (const childId of children) parentOfStudent.set(String(childId), p.id);
  }
  for (const s of students) {
    const pid = (s.data() as { parentId?: string }).parentId;
    if (pid && !parentOfStudent.has(s.id)) parentOfStudent.set(s.id, String(pid));
  }

  const staffId = staff[0]?.id ?? 'seed-staff';
  const staffName = (staff[0]?.data() as { name?: string })?.name ?? 'Tata Usaha';
  const targetStudents = students.slice(0, 6);

  const now = new Date();
  const yearNum = now.getFullYear();
  const monthNum = now.getMonth() + 1;
  let schoolBalance = 0;
  let seq = 0;
  const nextNo = (prefix: string) => `${prefix}-SEED-${String(++seq).padStart(4, '0')}`;

  const makeInvoice = async (
    studentId: string,
    studentName: string,
    parentId: string,
    opts: { amount: number; paid: boolean; title: string; overdue?: boolean }
  ) => {
    const ref = db.collection('invoices').doc();
    await ref.set({
      schoolId,
      invoiceNumber: nextNo('INV'),
      studentId,
      parentId: parentId || null,
      studentName,
      amount: opts.amount,
      paidAmount: opts.paid ? opts.amount : 0,
      remainingAmount: opts.paid ? 0 : opts.amount,
      status: opts.paid ? 'paid' : 'pending',
      description: opts.title,
      items: [{ description: opts.title, quantity: 1, price: opts.amount, total: opts.amount }],
      financeUnit: 'yayasan',
      dueDate: opts.overdue ? daysAgo(10) : new Date(yearNum, monthNum, 10),
      month: monthNum,
      year: yearNum,
      createdBy: staffId,
      createdAt: daysAgo(20),
      updatedAt: now,
    });
    return ref.id;
  };

  console.log(`Seeding invoices, attempts & ledger for ${targetStudents.length} students...`);

  for (let i = 0; i < targetStudents.length; i++) {
    const sDoc = targetStudents[i];
    const studentId = sDoc.id;
    const studentName = (sDoc.data() as { name?: string }).name ?? `Siswa ${i + 1}`;
    const parentId = parentOfStudent.get(studentId) ?? '';

    // 1) Outstanding SPP (shows in parent hub + POS)
    const unpaidInvoiceId = await makeInvoice(studentId, studentName, parentId, {
      amount: 500_000,
      paid: false,
      title: `SPP Bulan ${monthNum}/${yearNum}`,
      overdue: i % 3 === 0,
    });

    // 2) Settled ONLINE via Xendit → attempt + ledger row (parent sees receipt)
    const onlineAmount = 350_000;
    const onlineInvoiceId = await makeInvoice(studentId, studentName, parentId, {
      amount: onlineAmount,
      paid: true,
      title: `Uang Kegiatan ${yearNum}`,
    });
    const onlineAttemptRef = db.collection('paymentAttempts').doc();
    await onlineAttemptRef.set({
      paymentAttemptId: onlineAttemptRef.id,
      userId: parentId || studentId,
      amount: onlineAmount,
      paymentMethod: 'BANK_TRANSFER',
      externalId: `xnd_seed_${onlineAttemptRef.id}`,
      status: 'SUCCEEDED',
      paymentType: 'TUITION',
      metaData: {
        invoiceId: onlineInvoiceId,
        referenceId: onlineInvoiceId,
        studentId,
        schoolId,
        description: `Uang Kegiatan ${yearNum}`,
      },
      invoiceUrl: 'https://checkout-staging.xendit.co/web/seed',
      createdAt: daysAgo(5 + i),
    });
    const onlineTxRef = db.collection('transactions').doc();
    await onlineTxRef.set({
      transactionId: onlineTxRef.id,
      paymentAttemptId: onlineAttemptRef.id,
      sourceWalletId: EXTERNAL_XENDIT,
      destinationWalletId: schoolWalletId(schoolId),
      amount: onlineAmount,
      category: 'TUITION_PAYMENT',
      metaData: {
        referenceId: onlineInvoiceId,
        description: `Uang Kegiatan ${yearNum} — ${studentName}`,
      },
      timestamp: daysAgo(5 + i),
    });
    schoolBalance += onlineAmount;

    // 3) Settled MANUAL CASH at the TU desk → ledger row (MANUAL_CASH_POS)
    const cashAmount = 200_000;
    const cashInvoiceId = await makeInvoice(studentId, studentName, parentId, {
      amount: cashAmount,
      paid: true,
      title: 'Seragam Sekolah',
    });
    const cashTxRef = db.collection('transactions').doc();
    await cashTxRef.set({
      transactionId: cashTxRef.id,
      paymentAttemptId: null,
      sourceWalletId: EXTERNAL_CASH,
      destinationWalletId: schoolWalletId(schoolId),
      amount: cashAmount,
      category: 'TUITION_PAYMENT',
      metaData: {
        referenceId: nextNo('POS'),
        description: `POS Tunai — Seragam — ${studentName}`,
        paymentMethod: 'MANUAL_CASH_POS',
        processedBy: staffId,
        processedByName: staffName,
        invoiceIds: [cashInvoiceId],
      },
      timestamp: daysAgo(2 + i),
    });
    schoolBalance += cashAmount;

    // 4) Wallet refill for first 3 students → credits their STUDENT wallet
    if (i < 3) {
      const refill = 100_000;
      const refillAttemptRef = db.collection('paymentAttempts').doc();
      await refillAttemptRef.set({
        paymentAttemptId: refillAttemptRef.id,
        userId: parentId || studentId,
        amount: refill,
        paymentMethod: 'EWALLET',
        externalId: `xnd_seed_${refillAttemptRef.id}`,
        status: 'SUCCEEDED',
        paymentType: 'WALLET_REFILL',
        metaData: { studentId, schoolId, description: 'Top up dompet siswa' },
        invoiceUrl: 'https://checkout-staging.xendit.co/web/seed',
        createdAt: daysAgo(1),
      });
      const refillTxRef = db.collection('transactions').doc();
      await refillTxRef.set({
        transactionId: refillTxRef.id,
        paymentAttemptId: refillAttemptRef.id,
        sourceWalletId: EXTERNAL_XENDIT,
        destinationWalletId: studentWalletId(studentId),
        amount: refill,
        category: 'WALLET_REFILL',
        metaData: { description: `Top up dompet — ${studentName}` },
        timestamp: daysAgo(1),
      });
      await db.collection('wallets').doc(studentWalletId(studentId)).set({
        walletId: studentWalletId(studentId),
        ownerId: studentId,
        ownerType: 'STUDENT',
        balance: refill,
        currency: 'IDR',
        updatedAt: now,
      });
    }
  }

  // 5) One PENDING attempt (awaiting payment) for the demo parent hub
  const firstStudent = targetStudents[0];
  const firstParentId = parentOfStudent.get(firstStudent.id) ?? firstStudent.id;
  const pendingRef = db.collection('paymentAttempts').doc();
  await pendingRef.set({
    paymentAttemptId: pendingRef.id,
    userId: firstParentId,
    amount: 500_000,
    paymentMethod: 'INVOICE',
    externalId: `xnd_seed_${pendingRef.id}`,
    status: 'PENDING',
    paymentType: 'TUITION',
    metaData: { studentId: firstStudent.id, schoolId, description: 'Menunggu pembayaran SPP' },
    invoiceUrl: 'https://checkout-staging.xendit.co/web/seed-pending',
    createdAt: now,
  });

  // 6) A disbursement / payout OUTFLOW (school → bank) for the treasury view
  const payoutAmount = 500_000;
  const payoutTxRef = db.collection('transactions').doc();
  await payoutTxRef.set({
    transactionId: payoutTxRef.id,
    paymentAttemptId: null,
    sourceWalletId: schoolWalletId(schoolId),
    destinationWalletId: EXTERNAL_BANK,
    amount: payoutAmount,
    category: 'CANTEEN_PAYOUT',
    metaData: {
      description: 'Pencairan dana ke rekening BCA 1234567890 a.n. Yayasan',
      bankCode: 'BCA',
      accountNumber: '1234567890',
      accountHolder: 'Yayasan',
    },
    timestamp: daysAgo(1),
  });
  schoolBalance -= payoutAmount;

  // 7) Virtual + school wallets (balances reflect the seeded ledger)
  await db.collection('wallets').doc(schoolWalletId(schoolId)).set({
    walletId: schoolWalletId(schoolId),
    ownerId: schoolId,
    ownerType: 'SCHOOL_SYSTEM',
    balance: schoolBalance,
    currency: 'IDR',
    updatedAt: now,
  });
  for (const wid of [EXTERNAL_XENDIT, EXTERNAL_CASH, EXTERNAL_BANK]) {
    await db.collection('wallets').doc(wid).set(
      {
        walletId: wid,
        ownerId: wid === EXTERNAL_CASH ? 'CASH' : wid === EXTERNAL_BANK ? 'BANK' : 'XENDIT',
        ownerType: 'SCHOOL_SYSTEM',
        balance: 0,
        currency: 'IDR',
        updatedAt: now,
      },
      { merge: true }
    );
  }

  // 8) Price groups + payment plan + SCHEDULED advance invoices
  const yearsSnap = await db.collection('years').where('schoolId', '==', schoolId).limit(1).get();
  const yearId = yearsSnap.empty ? null : yearsSnap.docs[0].id;
  const yearName = yearsSnap.empty ? '2025/2026' : String(yearsSnap.docs[0].data().name ?? '2025/2026');

  const stdGroupRef = db.collection('priceGroups').doc();
  await stdGroupRef.set({
    schoolId,
    name: 'Standar',
    description: 'Tarif reguler',
    isDefault: true,
    createdAt: now,
    updatedAt: now,
  });
  const beasiswaGroupRef = db.collection('priceGroups').doc();
  await beasiswaGroupRef.set({
    schoolId,
    name: 'Beasiswa 50%',
    description: 'Keringanan setengah tarif',
    isDefault: false,
    createdAt: now,
    updatedAt: now,
  });

  if (yearId) {
    const planRef = db.collection('paymentPlans').doc();
    const monthlyAmounts = [
      500_000, 500_000, 500_000, 500_000, 500_000, 500_000,
      500_000, 500_000, 500_000, 500_000, 500_000, 500_000,
    ];
    await planRef.set({
      schoolId,
      yearId,
      name: `Struktur ${yearName}`,
      isActive: true,
      scope: { priceGroupId: stdGroupRef.id },
      items: [
        {
          id: 'item_spp_monthly',
          name: 'SPP Bulanan',
          category: 'monthly_school',
          financeUnit: 'yayasan',
          type: 'monthly',
          amount: 500_000,
          monthlyAmounts,
        },
      ],
      createdAt: now,
      updatedAt: now,
    });

    // SCHEDULED invoices (Sep–Dec) for first student — advance pay demo
    const demoStudent = targetStudents[0];
    const demoParent = parentOfStudent.get(demoStudent.id) ?? '';
    const futureMonths = [
      { month: 9, year: 2025, label: 'September' },
      { month: 10, year: 2025, label: 'Oktober' },
      { month: 11, year: 2025, label: 'November' },
    ];
    for (const fm of futureMonths) {
      await db.collection('invoices').doc().set({
        schoolId,
        invoiceNumber: nextNo('INV'),
        studentId: demoStudent.id,
        parentId: demoParent,
        studentName: (demoStudent.data() as { name?: string }).name ?? 'Siswa Demo',
        amount: 500_000,
        dueDate: new Date(fm.year, fm.month - 1, 10),
        paidAmount: 0,
        remainingAmount: 500_000,
        status: 'scheduled',
        description: `SPP Bulanan — ${fm.label}`,
        items: [{ description: `SPP ${fm.label}`, quantity: 1, price: 500_000, total: 500_000 }],
        financeUnit: 'yayasan',
        category: 'monthly_school',
        month: fm.month,
        year: fm.year,
        academicYearId: yearId,
        paymentPlanId: planRef.id,
        planItemId: 'item_spp_monthly',
        createdBy: staffId,
        createdAt: now,
        updatedAt: now,
      });
    }

    await db.collection(USERS_COLLECTION).doc(demoStudent.id).set(
      { priceGroupId: stdGroupRef.id, updatedAt: now },
      { merge: true }
    );
  }

  console.log('\nDone. Seeded payment demo data:');
  console.log(`  • Students covered:     ${targetStudents.length}`);
  console.log(`  • Invoices:             ${targetStudents.length * 3}+ (incl. SCHEDULED advance)`);
  console.log(`  • Price groups:         Standar + Beasiswa 50%`);
  console.log(`  • Payment plan:         active for ${yearName}`);
  console.log(`  • School wallet balance: Rp ${schoolBalance.toLocaleString('id-ID')}`);
  console.log('  • Ledger: online (Xendit), manual cash (POS), refills, 1 payout');
  console.log('  • 1 pending Xendit attempt for the parent hub');
}

seedPayments().catch((e) => {
  console.error('❌', e?.message || e);
  process.exit(1);
});
