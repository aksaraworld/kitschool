import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import { createTicket, listTickets } from '@/lib/server/tickets';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const tickets = await listTickets(auth, schoolId);
    return NextResponse.json(tickets, {
      headers: { 'Cache-Control': 'private, max-age=10' },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server error';
    const status = msg === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ message: msg }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const ticket = await createTicket(auth, schoolId, {
      category: String(body.category ?? ''),
      subject: String(body.subject ?? ''),
      description: String(body.description ?? ''),
    });
    return NextResponse.json(ticket, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server error';
    const status = msg === 'Forbidden' ? 403 : 400;
    return NextResponse.json({ message: msg }, { status });
  }
}
