/**
 * Serverless GET/POST /api/communications.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import { communicationsCollection, docToJson } from '@/lib/server/firebase-admin';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const type = req.nextUrl.searchParams.get('type'); // 'sent' | 'received'

    let query = communicationsCollection().where('schoolId', '==', schoolId);
    if (type === 'sent') query = query.where('senderId', '==', auth.uid) as ReturnType<typeof communicationsCollection>;
    if (type === 'received') query = query.where('receiverId', '==', auth.uid) as ReturnType<typeof communicationsCollection>;

    const snapshot = await query.get();
    const rows = snapshot.docs.map((d) => docToJson(d));
    return NextResponse.json(rows);
  } catch (e) {
    console.error('GET /api/communications error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const ref = communicationsCollection().doc();
    await ref.set({
      ...body,
      schoolId,
      senderId: auth.uid,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const created = await ref.get();
    return NextResponse.json(docToJson(created), { status: 201 });
  } catch (e) {
    console.error('POST /api/communications error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
