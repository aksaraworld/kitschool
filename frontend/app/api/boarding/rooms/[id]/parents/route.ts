import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import { getRoomParentRecipients } from '@/lib/server/boarding';
import { canUseChat } from '@/lib/server/chat-permissions';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser(req);
    if (!auth || !canUseChat(auth)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const { id } = await params;
    const recipients = await getRoomParentRecipients(schoolId, id);
    return NextResponse.json(recipients);
  } catch (e) {
    console.error('GET /api/boarding/rooms/[id]/parents error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
