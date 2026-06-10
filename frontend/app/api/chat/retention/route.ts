import { NextRequest, NextResponse } from 'next/server';
import { runChatRetentionJob } from '@/lib/server/chat-retention';

/** Daily cron: archive & purge chat messages older than 60 days. */
export async function GET(req: NextRequest) {
  try {
    const secret = process.env.CRON_SECRET;
    if (secret) {
      const auth = req.headers.get('authorization');
      if (auth !== `Bearer ${secret}`) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
      }
    }

    const result = await runChatRetentionJob();
    return NextResponse.json({ message: 'OK', ...result });
  } catch (e) {
    console.error('GET /api/chat/retention error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
