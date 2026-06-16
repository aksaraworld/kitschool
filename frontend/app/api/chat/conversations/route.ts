import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import {
  canUseChat,
  canMessageUser,
  conversationIdFor,
} from '@/lib/server/chat-permissions';
import {
  canHandlePublicChat,
  ensureStaffJoinedPublicChat,
} from '@/lib/server/public-chat-staff';
import {
  chatConversationsCollection,
  usersCollection,
  docToJson,
} from '@/lib/server/firebase-admin';
import type { ChatParticipant } from '@/lib/types';

const CONVERSATION_LIMIT = 80;

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!canUseChat(auth)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const [directSnap, publicSnap] = await Promise.all([
      chatConversationsCollection()
        .where('schoolId', '==', schoolId)
        .where('participantIds', 'array-contains', auth.uid)
        .get(),
      canHandlePublicChat(auth)
        ? chatConversationsCollection()
            .where('schoolId', '==', schoolId)
            .where('kind', '==', 'public_inquiry')
            .limit(40)
            .get()
        : Promise.resolve(null),
    ]);

    const byId = new Map<string, ReturnType<typeof docToJson>>();
    for (const d of directSnap.docs) {
      byId.set(d.id, docToJson(d));
    }
    if (publicSnap) {
      for (const d of publicSnap.docs) {
        if (!byId.has(d.id)) byId.set(d.id, docToJson(d));
      }
    }

    const rows = [...byId.values()].sort((a, b) =>
      String(b.lastMessageAt ?? '').localeCompare(String(a.lastMessageAt ?? ''))
    ).slice(0, CONVERSATION_LIMIT);

    return NextResponse.json(rows, {
      headers: { 'Cache-Control': 'private, max-age=15' },
    });
  } catch (e) {
    console.error('GET /api/chat/conversations error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!canUseChat(auth)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const recipientId = String(body.recipientId ?? '').trim();
    if (!recipientId) return NextResponse.json({ message: 'recipientId required' }, { status: 400 });

    const [senderSnap, recipientSnap] = await Promise.all([
      usersCollection().doc(auth.uid).get(),
      usersCollection().doc(recipientId).get(),
    ]);
    if (!senderSnap.exists || !recipientSnap.exists) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const sender = { ...(senderSnap.data() as object), uid: auth.uid, schoolId } as Parameters<
      typeof canMessageUser
    >[0];
    const recipient = {
      ...(recipientSnap.data() as object),
      uid: recipientId,
      schoolId,
    } as Parameters<typeof canMessageUser>[1];

    if (!(await canMessageUser(sender, recipient, schoolId))) {
      return NextResponse.json({ message: 'Tidak diizinkan mengirim pesan ke pengguna ini' }, { status: 403 });
    }

    const convId = conversationIdFor(auth.uid, recipientId);
    const ref = chatConversationsCollection().doc(convId);
    const existing = await ref.get();

    if (existing.exists) {
      return NextResponse.json(docToJson(existing));
    }

    const toParticipant = (uid: string, data: Record<string, unknown>): ChatParticipant => {
      const p: ChatParticipant = {
        uid,
        name: String(data.name ?? 'Pengguna'),
        role: String(data.role ?? ''),
      };
      if (typeof data.avatar === 'string' && data.avatar) {
        p.avatar = data.avatar;
      }
      return p;
    };

    const senderData = senderSnap.data() as Record<string, unknown>;
    const recipientData = recipientSnap.data() as Record<string, unknown>;
    const now = new Date();

    await ref.set({
      schoolId,
      participantIds: [auth.uid, recipientId],
      participants: {
        [auth.uid]: toParticipant(auth.uid, senderData),
        [recipientId]: toParticipant(recipientId, recipientData),
      },
      unreadCount: { [auth.uid]: 0, [recipientId]: 0 },
      createdAt: now,
      updatedAt: now,
    });

    const created = await ref.get();
    return NextResponse.json(docToJson(created), { status: 201 });
  } catch (e) {
    console.error('POST /api/chat/conversations error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
