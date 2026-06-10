import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import { getUserNotifications } from '@/lib/server/notifications';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const schoolId = getSchoolId(req, auth);
    if (!schoolId) {
      return NextResponse.json({ notifications: [], unreadCount: 0 });
    }

    const result = await getUserNotifications(auth, schoolId);
    return NextResponse.json(result);
  } catch (e) {
    console.error('GET /api/notifications error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
