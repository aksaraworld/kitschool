import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/server/auth-helpers';
import { canUseChat } from '@/lib/server/chat-permissions';
import { exportUserChatBackup } from '@/lib/server/chat-retention';

const MONTH_RE = /^\d{4}-\d{2}$/;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ month: string }> }
) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!canUseChat(auth)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const { month } = await params;
    if (!MONTH_RE.test(month)) {
      return NextResponse.json({ message: 'Invalid month format (YYYY-MM)' }, { status: 400 });
    }

    const data = await exportUserChatBackup(auth.uid, month);
    if (!data) return NextResponse.json({ message: 'Not found' }, { status: 404 });

    const download = req.nextUrl.searchParams.get('download') === '1';
    if (download) {
      const filename = `chat-history-${month}.json`;
      return new NextResponse(JSON.stringify(data, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    return NextResponse.json(data);
  } catch (e) {
    console.error('GET /api/chat/backup/[month] error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
