import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import { getBoardingDashboard } from '@/lib/server/boarding';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const stats = await getBoardingDashboard(schoolId);
    return NextResponse.json(stats);
  } catch (e) {
    console.error('GET /api/boarding/dashboard error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
