import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import { canManageBoarding, getBoardingFinanceSummary } from '@/lib/server/boarding';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!canManageBoarding(auth)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const summary = await getBoardingFinanceSummary(schoolId);
    return NextResponse.json(summary);
  } catch (e) {
    console.error('GET /api/boarding/finance error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
