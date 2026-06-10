import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/server/auth-helpers';
import { canUseChat } from '@/lib/server/chat-permissions';
import { chatConversationsCollection } from '@/lib/server/firebase-admin';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!canUseChat(auth)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const ref = chatConversationsCollection().doc(id);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ message: 'Not found' }, { status: 404 });

    const conv = snap.data() as { participantIds?: string[]; unreadCount?: Record<string, number> };
    if (!conv.participantIds?.includes(auth.uid)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    await ref.update({
      [`unreadCount.${auth.uid}`]: 0,
      updatedAt: new Date(),
    });

    return NextResponse.json({ message: 'OK' });
  } catch (e) {
    console.error('PUT chat read error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
