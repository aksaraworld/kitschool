/**
 * GET /api/transaction-fees/statistics – SaaS admin fee stats.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/server/auth-helpers';
import { UserRole } from '@/lib/types';

const EMPTY_STATS = {
  totalTransactions: 0,
  totalTransactionAmount: 0,
  totalAdminFee: 0,
  totalNetAmount: 0,
  feeBreakdown: {
    paymentGateway: 0,
    platform: 0,
    tax: 0,
  },
};

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (auth.role !== UserRole.SAAS_ADMIN) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    // Stub until transaction-fees collection is populated
    return NextResponse.json(EMPTY_STATS);
  } catch (e) {
    console.error('GET /api/transaction-fees/statistics error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
