/**
 * Serverless GET /api/classes/[id].
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import { classesCollection, yearsCollection, majorsCollection, docToJson } from '@/lib/server/firebase-admin';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const doc = await classesCollection().doc(id).get();
    if (!doc.exists) return NextResponse.json({ message: 'Not found' }, { status: 404 });

    const row = docToJson(doc) as Record<string, unknown>;
    const schoolId = getSchoolId(req, auth);
    const dataSchoolId = (doc.data() as { schoolId?: string })?.schoolId;
    if (schoolId && dataSchoolId !== schoolId) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const yearId = row.yearId as string | undefined;
    const majorId = row.majorId as string | undefined;
    if (yearId) {
      const y = await yearsCollection().doc(yearId).get();
      row.yearId = y.exists ? docToJson(y) : { _id: yearId, name: 'N/A' };
    }
    if (majorId) {
      const m = await majorsCollection().doc(majorId).get();
      row.majorId = m.exists ? docToJson(m) : { _id: majorId, name: 'N/A' };
    }
    return NextResponse.json(row);
  } catch (e) {
    console.error('GET /api/classes/[id] error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
