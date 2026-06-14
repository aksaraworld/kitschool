/**
 * GET /api/finance/revenue — revenue report per finance unit.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import { canViewFinanceReports, getRevenueReport } from '@/lib/server/finance';
import { FinanceUnit } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!canViewFinanceReports(auth)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const now = new Date();
    const defaultFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const defaultTo = now.toISOString().slice(0, 10);

    const from = req.nextUrl.searchParams.get('from') ?? defaultFrom;
    const to = req.nextUrl.searchParams.get('to') ?? defaultTo;
    const unitParam = req.nextUrl.searchParams.get('financeUnit');
    const financeUnit = unitParam && Object.values(FinanceUnit).includes(unitParam as FinanceUnit)
      ? (unitParam as FinanceUnit)
      : undefined;

    const report = await getRevenueReport(schoolId, from, to, financeUnit);
    return NextResponse.json(report);
  } catch (e) {
    console.error('GET /api/finance/revenue error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
