import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import { canUseChat, getChatRecipients } from '@/lib/server/chat-permissions';
import { ROLE_LABELS } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!canUseChat(auth)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const q = req.nextUrl.searchParams.get('q') ?? undefined;
    const role = req.nextUrl.searchParams.get('role') ?? undefined;
    const limit = Number(req.nextUrl.searchParams.get('limit') ?? 100);

    const recipients = await getChatRecipients(auth, schoolId, { q, role, limit });

    return NextResponse.json(
      recipients.map((u) => ({
        _id: u.uid,
        uid: u.uid,
        name: u.name ?? 'Pengguna',
        email: u.email,
        role: u.role,
        roleLabel: ROLE_LABELS[u.role ?? ''] ?? u.role,
        avatar: u.avatar,
      })),
      {
        headers: {
          'Cache-Control': 'private, max-age=60',
        },
      }
    );
  } catch (e) {
    console.error('GET /api/chat/recipients error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
