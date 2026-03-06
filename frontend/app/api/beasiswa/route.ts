/**
 * GET/POST /api/beasiswa – list and create scholarship programs. Staff/Principal.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId, hasFullAccess, hasAnyRole } from '@/lib/server/auth-helpers';
import { UserRole, ROLES_CAN_MANAGE_USERS } from '@/lib/types';
import { scholarshipsCollection, docToJson } from '@/lib/server/firebase-admin';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const activeOnly = req.nextUrl.searchParams.get('active') === 'true';
    let query = scholarshipsCollection().where('schoolId', '==', schoolId);
    if (activeOnly) {
      const snap = await query.get();
      const rows = snap.docs.filter((d) => (d.data() as { isActive?: boolean }).isActive !== false).map((d) => docToJson(d));
      return NextResponse.json(rows);
    }
    const snapshot = await query.get();
    const rows = snapshot.docs.map((d) => docToJson(d));
    return NextResponse.json(rows);
  } catch (e) {
    console.error('GET /api/beasiswa error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!hasFullAccess(auth) && !hasAnyRole(auth, ROLES_CAN_MANAGE_USERS.map(String))) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const ref = scholarshipsCollection().doc();
    await ref.set({
      name: body.name ?? 'Program Beasiswa',
      description: body.description ?? '',
      schoolId,
      isActive: body.isActive ?? true,
      yearId: body.yearId ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const created = await ref.get();
    return NextResponse.json(docToJson(created), { status: 201 });
  } catch (e) {
    console.error('POST /api/beasiswa error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
