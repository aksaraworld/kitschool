/**
 * POST /api/admin/seed-dummy
 * Seeds dummy data for: grades (UAS/UTS/PR), cash flow, pending profile changes, school rankingMatrix.
 * Principal/Staff only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId, hasFullAccess, hasAnyRole } from '@/lib/server/auth-helpers';
import {
  getFirestore,
  usersCollection,
  classesCollection,
  yearsCollection,
  gradesCollection,
  cashFlowCollection,
  pendingProfileChangesCollection,
  schoolsCollection,
} from '@/lib/server/firebase-admin';
import { UserRole } from '@/lib/types';

const BATCH_SIZE = 400;

function randomBetween(min: number, max: number) {
  return Math.round(min + Math.random() * (max - min));
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!hasFullAccess(auth) && !hasAnyRole(auth, [UserRole.STAFF])) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const [yearsSnap, classesSnap, usersSnap, gradesExisting, schoolSnap] = await Promise.all([
      yearsCollection().where('schoolId', '==', schoolId).get(),
      classesCollection().where('schoolId', '==', schoolId).get(),
      usersCollection().where('schoolId', '==', schoolId).get(),
      gradesCollection().where('schoolId', '==', schoolId).limit(1).get(),
      schoolsCollection().doc(schoolId).get(),
    ]);

    const years = yearsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as { id: string; name?: string; isActive?: boolean }));
    const activeYear = years.find((y) => y.isActive) ?? years[0];
    const yearId = activeYear?.id;
    if (!yearId) {
      return NextResponse.json({ message: 'Buat tahun ajaran terlebih dahulu' }, { status: 400 });
    }

    const classes = classesSnap.docs
      .filter((d) => (d.data() as { yearId?: string }).yearId === yearId)
      .map((d) => ({ id: d.id, ...d.data() } as { id: string; studentIds?: string[]; majorId?: string }));
    const studentIds = [...new Set(classes.flatMap((c) => c.studentIds ?? []))];
    const students = usersSnap.docs
      .filter((d) => (d.data() as { role?: string }).role === 'student' && studentIds.includes(d.id))
      .map((d) => d.id);
    const parents = usersSnap.docs
      .filter((d) => (d.data() as { role?: string }).role === 'parent')
      .map((d) => ({ id: d.id, children: (d.data() as { children?: string[] }).children ?? [] }));

    const stats = { grades: 0, cashFlow: 0, pendingChanges: 0, rankingMatrix: false };
    const db = getFirestore();
    let batch = db.batch();
    let opCount = 0;

    // 1. Grades (UAS/UTS/PR) – only if no grades exist
    if (gradesExisting.empty && students.length > 0) {
      const components = [
        { key: 'UAS', min: 70, max: 95 },
        { key: 'UTS', min: 65, max: 92 },
        { key: 'PR', min: 60, max: 90 },
      ];
      for (const sid of students) {
        for (const comp of components) {
          const ref = gradesCollection().doc();
          batch.set(ref, {
            schoolId,
            studentId: sid,
            marksObtained: randomBetween(comp.min, comp.max),
            componentKey: comp.key,
            yearId,
            isPublished: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          opCount++;
          stats.grades++;
          if (opCount >= BATCH_SIZE) {
            await batch.commit();
            batch = db.batch();
            opCount = 0;
          }
        }
      }
    }

    // 2. Cash flow entries
    const cashEntries = [
      { type: 'in' as const, amount: 50000000, desc: 'SPP bulan ini' },
      { type: 'in' as const, amount: 15000000, desc: 'Donasi wali murid' },
      { type: 'out' as const, amount: 12000000, desc: 'Listrik & air' },
      { type: 'out' as const, amount: 8000000, desc: 'Gaji guru honorer' },
      { type: 'in' as const, amount: 3000000, desc: 'Dana kegiatan' },
    ];
    const today = new Date().toISOString().slice(0, 10);
    const cashSnap = await cashFlowCollection().where('schoolId', '==', schoolId).limit(1).get();
    if (cashSnap.empty) {
      for (const e of cashEntries) {
        const ref = cashFlowCollection().doc();
        batch.set(ref, {
          schoolId,
          type: e.type,
          amount: e.amount,
          description: e.desc,
          date: today,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        opCount++;
        stats.cashFlow++;
        if (opCount >= BATCH_SIZE) {
          await batch.commit();
          batch = db.batch();
          opCount = 0;
        }
      }
    }

    // 3. Pending profile changes (1 per parent with children)
    const pendingSnap = await pendingProfileChangesCollection()
      .where('schoolId', '==', schoolId)
      .where('status', '==', 'pending')
      .limit(1)
      .get();
    if (pendingSnap.empty) {
      for (const p of parents) {
        const childId = p.children.find((c) => students.includes(c));
        if (childId) {
          const ref = pendingProfileChangesCollection().doc();
          batch.set(ref, {
            schoolId,
            studentId: childId,
            changes: { address: 'Jl. Contoh Baru No. 123', phone: '08123456789' },
            status: 'pending',
            requestedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          opCount++;
          stats.pendingChanges++;
          break; // only 1 pending for demo
        }
      }
    }

    // 4. School rankingMatrix (if not set)
    const schoolData = schoolSnap.exists ? (schoolSnap.data() as { rankingMatrix?: unknown }) : {};
    if (!schoolData.rankingMatrix) {
      await schoolsCollection().doc(schoolId).set(
        { rankingMatrix: { wUas: 50, wUts: 30, wPr: 20 }, updatedAt: new Date() },
        { merge: true }
      );
      stats.rankingMatrix = true;
    }

    if (opCount > 0) await batch.commit();

    return NextResponse.json({
      message: 'Dummy data seeded',
      stats: {
        grades: stats.grades,
        cashFlow: stats.cashFlow,
        pendingProfileChanges: stats.pendingChanges,
        rankingMatrix: stats.rankingMatrix,
      },
    });
  } catch (e) {
    console.error('POST /api/admin/seed-dummy error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
