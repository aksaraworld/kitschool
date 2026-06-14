import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import { getTicketStats } from '@/lib/server/tickets';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const stats = await getTicketStats(auth, schoolId);
    return NextResponse.json(stats, {
      headers: { 'Cache-Control': 'private, max-age=30' },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server error';
    const status = msg === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ message: msg }, { status });
  }
}
