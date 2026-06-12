import { NextRequest, NextResponse } from 'next/server';
import { getPublicChatMessages, sendPublicChatMessage } from '@/lib/server/public-chat';

function clientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

function getToken(req: NextRequest): string | null {
  return req.headers.get('x-public-chat-token')?.trim() || null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const token = getToken(req);
    if (!token) return NextResponse.json({ message: 'Token required' }, { status: 401 });

    const result = await getPublicChatMessages(sessionId, token);
    if ('error' in result) {
      return NextResponse.json({ message: result.error }, { status: 401 });
    }
    return NextResponse.json(result);
  } catch (e) {
    console.error('GET public chat messages error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const token = getToken(req);
    if (!token) return NextResponse.json({ message: 'Token required' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const result = await sendPublicChatMessage(
      sessionId,
      token,
      String(body.text ?? ''),
      clientIp(req)
    );

    if ('error' in result) {
      return NextResponse.json({ message: result.error }, { status: 400 });
    }
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    console.error('POST public chat messages error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
