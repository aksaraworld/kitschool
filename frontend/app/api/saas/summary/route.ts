/**
 * GET /api/saas/summary – single call for SaaS admin dashboard.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/server/auth-helpers';
import { schoolsCollection, docToJson } from '@/lib/server/firebase-admin';
import { UserRole } from '@/lib/types';

const EMPTY_STATS = {
  totalTransactions: 0,
  totalTransactionAmount: 0,
  totalAdminFee: 0,
  totalNetAmount: 0,
  feeBreakdown: { paymentGateway: 0, platform: 0, tax: 0 },
};

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (auth.role !== UserRole.SAAS_ADMIN) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const schoolsSnap = await schoolsCollection().get();
    const schools = schoolsSnap.docs.map((d) => docToJson(d));

    return NextResponse.json(
      {
        schools,
        stats: EMPTY_STATS,
        config: [
          { key: 'admin_fee_percentage', value: 10, type: 'number' },
          { key: 'subscriptionFeePerStudent', value: 45000, type: 'number' },
        ],
      },
      { headers: { 'Cache-Control': 'private, max-age=60' } }
    );
  } catch (e) {
    console.error('GET /api/saas/summary error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
