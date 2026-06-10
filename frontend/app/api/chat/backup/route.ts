import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/server/auth-helpers';
import { canUseChat } from '@/lib/server/chat-permissions';
import { listUserChatBackupMonths } from '@/lib/server/chat-retention';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!canUseChat(auth)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const months = await listUserChatBackupMonths(auth.uid);
    return NextResponse.json({ months, retentionDays: 60 });
  } catch (e) {
    console.error('GET /api/chat/backup error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
