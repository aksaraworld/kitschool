/**
 * POST /api/finance/generate-bills — generate monthly/yearly bills from catalog.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import { canManageCatalog, generateBillsForSchool } from '@/lib/server/finance';
import { FeeFrequency } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!canManageCatalog(auth)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const { month, year, studentId, frequency } = body as {
      month?: number;
      year?: number;
      studentId?: string;
      frequency?: FeeFrequency;
    };

    const result = await generateBillsForSchool(schoolId, auth.uid, {
      month: month ?? new Date().getMonth() + 1,
      year: year ?? new Date().getFullYear(),
      studentId,
      frequency,
    });

    return NextResponse.json(result);
  } catch (e) {
    console.error('POST /api/finance/generate-bills error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
