import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import { updateTicket } from '@/lib/server/tickets';
import type { TicketStatus } from '@/lib/types';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const ticket = await updateTicket(auth, schoolId, id, {
      status: body.status as TicketStatus | undefined,
      resolutionNote: body.resolutionNote,
    });
    return NextResponse.json(ticket);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server error';
    const status = msg === 'Forbidden' ? 403 : msg.includes('tidak') ? 404 : 400;
    return NextResponse.json({ message: msg }, { status });
  }
}
