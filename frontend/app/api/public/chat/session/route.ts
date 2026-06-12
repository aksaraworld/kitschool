import { NextRequest, NextResponse } from 'next/server';
import { createPublicChatSession } from '@/lib/server/public-chat';

function clientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const result = await createPublicChatSession({
      schoolSlug: String(body.schoolSlug ?? ''),
      name: String(body.name ?? ''),
      contact: String(body.contact ?? ''),
      honeypot: String(body.website ?? body.honeypot ?? ''),
      ip: clientIp(req),
    });

    if ('error' in result) {
      return NextResponse.json({ message: result.error }, { status: 400 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    console.error('POST /api/public/chat/session error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
