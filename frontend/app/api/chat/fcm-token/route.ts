import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/server/auth-helpers';
import { usersCollection } from '@/lib/server/firebase-admin';

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const token = String(body.token ?? '').trim();
    if (!token) return NextResponse.json({ message: 'token required' }, { status: 400 });

    const ref = usersCollection().doc(auth.uid);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ message: 'User not found' }, { status: 404 });

    const existing = (snap.data() as { fcmTokens?: string[] })?.fcmTokens ?? [];
    const fcmTokens = [token, ...existing.filter((t) => t !== token)].slice(0, 5);

    await ref.update({
      fcmTokens,
      updatedAt: new Date(),
    });

    return NextResponse.json({ message: 'OK', registered: true, tokenCount: fcmTokens.length });
  } catch (e) {
    console.error('POST /api/chat/fcm-token error:', e);
    const message = e instanceof Error ? e.message : 'Server error';
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const token = String(body.token ?? '').trim();
    if (!token) return NextResponse.json({ message: 'token required' }, { status: 400 });

    const ref = usersCollection().doc(auth.uid);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ message: 'User not found' }, { status: 404 });

    const existing = (snap.data() as { fcmTokens?: string[] })?.fcmTokens ?? [];
    await ref.update({
      fcmTokens: existing.filter((t) => t !== token),
      updatedAt: new Date(),
    });

    return NextResponse.json({ message: 'OK' });
  } catch (e) {
    console.error('DELETE /api/chat/fcm-token error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
