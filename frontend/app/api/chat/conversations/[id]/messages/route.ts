import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import { canUseChat } from '@/lib/server/chat-permissions';
import { sendChatPush } from '@/lib/server/fcm';
import {
  chatConversationsCollection,
  chatMessagesCollection,
  usersCollection,
  docToJson,
} from '@/lib/server/firebase-admin';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!canUseChat(auth)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const convSnap = await chatConversationsCollection().doc(id).get();
    if (!convSnap.exists) return NextResponse.json({ message: 'Not found' }, { status: 404 });

    const conv = convSnap.data() as { participantIds?: string[] };
    if (!conv.participantIds?.includes(auth.uid)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') ?? 50), 100);
    const snap = await chatMessagesCollection(id)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    const messages = snap.docs.map((d) => docToJson(d)).reverse();
    return NextResponse.json(messages);
  } catch (e) {
    console.error('GET chat messages error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!canUseChat(auth)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const { id } = await params;
    const convRef = chatConversationsCollection().doc(id);
    const convSnap = await convRef.get();
    if (!convSnap.exists) return NextResponse.json({ message: 'Not found' }, { status: 404 });

    const conv = convSnap.data() as {
      participantIds?: string[];
      participants?: Record<string, { name?: string }>;
      unreadCount?: Record<string, number>;
    };
    if (!conv.participantIds?.includes(auth.uid)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const text = String(body.text ?? '').trim();
    if (!text) return NextResponse.json({ message: 'text required' }, { status: 400 });

    const now = new Date();
    const msgRef = chatMessagesCollection(id).doc();
    await msgRef.set({
      conversationId: id,
      schoolId,
      senderId: auth.uid,
      text,
      createdAt: now,
      readBy: { [auth.uid]: now.toISOString() },
    });

    const recipientId = conv.participantIds.find((p) => p !== auth.uid);
    const unreadCount = { ...(conv.unreadCount ?? {}) };
    if (recipientId) {
      unreadCount[recipientId] = (unreadCount[recipientId] ?? 0) + 1;
      unreadCount[auth.uid] = 0;
    }

    await convRef.update({
      lastMessage: text.slice(0, 200),
      lastMessageAt: now,
      lastSenderId: auth.uid,
      unreadCount,
      updatedAt: now,
    });

    if (recipientId) {
      const senderSnap = await usersCollection().doc(auth.uid).get();
      const senderName = (senderSnap.data() as { name?: string })?.name ?? 'Pesan baru';
      await sendChatPush(recipientId, {
        title: senderName,
        body: text.slice(0, 120),
        conversationId: id,
      });
    }

    const created = await msgRef.get();
    return NextResponse.json(docToJson(created), { status: 201 });
  } catch (e) {
    console.error('POST chat message error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
