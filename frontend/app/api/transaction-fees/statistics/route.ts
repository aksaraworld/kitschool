/**
 * Serverless GET /api/transaction-fees/statistics – stub for SaaS dashboard.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/server/auth-helpers';
import { UserRole } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (auth.role !== UserRole.SAAS_ADMIN) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    // Stub: return zero stats. Replace with real aggregation when transaction-fees collection exists.
    return NextResponse.json({
      totalRevenue: 0,
      totalFees: 0,
      schoolCount: 0,
      period: new Date().toISOString().slice(0, 7),
    });
  } catch (e) {
    console.error('GET /api/transaction-fees/statistics error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
