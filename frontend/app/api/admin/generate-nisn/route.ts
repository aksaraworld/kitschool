/**
 * POST /api/admin/generate-nisn
 * Generates NISN for all students in the school that don't have one.
 * Principal/Staff only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import { usersCollection } from '@/lib/server/firebase-admin';
import { UserRole } from '@/lib/types';

function generateNisn(existingNisns: Set<string>): string {
  let nisn = String(Math.floor(1000000000 + Math.random() * 900000000));
  let attempts = 0;
  while (existingNisns.has(nisn) && attempts < 100) {
    nisn = String(Math.floor(1000000000 + Math.random() * 900000000));
    attempts++;
  }
  return nisn;
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (auth.role !== UserRole.PRINCIPAL && auth.role !== UserRole.STAFF) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const snapshot = await usersCollection()
      .where('schoolId', '==', schoolId)
      .where('role', '==', UserRole.STUDENT)
      .get();

    const existingNisns = new Set<string>();
    const needNisn: { id: string }[] = [];

    for (const doc of snapshot.docs) {
      const d = doc.data() as { nisn?: string; studentId?: string };
      const n = (d.nisn ?? d.studentId ?? '').toString().trim();
      if (n) existingNisns.add(n);
      else needNisn.push({ id: doc.id });
    }

    let generated = 0;
    for (const { id } of needNisn) {
      const nisn = generateNisn(existingNisns);
      existingNisns.add(nisn);
      await usersCollection().doc(id).update({
        nisn,
        studentId: nisn,
        updatedAt: new Date(),
      });
      generated++;
    }

    return NextResponse.json({
      message: `Generated NISN for ${generated} students`,
      generated,
      total: snapshot.docs.length,
    });
  } catch (e) {
    console.error('POST /api/admin/generate-nisn error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
