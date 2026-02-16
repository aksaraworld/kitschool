/**
 * Serverless GET/POST /api/classes – list/create classes (scoped by school).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import {
  classesCollection,
  yearsCollection,
  majorsCollection,
  docToJson,
} from '@/lib/server/firebase-admin';
import { UserRole } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const [classesSnap, yearsSnap, majorsSnap] = await Promise.all([
      classesCollection().where('schoolId', '==', schoolId).get(),
      yearsCollection().where('schoolId', '==', schoolId).get(),
      majorsCollection().where('schoolId', '==', schoolId).get(),
    ]);

    const yearMap = new Map<string, { _id: string; name: string }>();
    yearsSnap.docs.forEach((d) => {
      const o = docToJson(d) as { id: string; name?: string };
      yearMap.set(o.id, { _id: o.id, name: o.name ?? '' });
    });
    const majorMap = new Map<string, { _id: string; name: string }>();
    majorsSnap.docs.forEach((d) => {
      const o = docToJson(d) as { id: string; name?: string };
      majorMap.set(o.id, { _id: o.id, name: o.name ?? '' });
    });

    const classes = classesSnap.docs.map((d) => {
      const row = docToJson(d) as Record<string, unknown>;
      const yearId = row.yearId as string | undefined;
      const majorId = row.majorId as string | undefined;
      if (yearId) row.yearId = yearMap.get(yearId) ?? { _id: yearId, name: 'N/A' };
      if (majorId) row.majorId = majorMap.get(majorId) ?? { _id: majorId, name: 'N/A' };
      return row;
    });
    return NextResponse.json(classes);
  } catch (e) {
    console.error('GET /api/classes error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (auth.role !== UserRole.STAFF && auth.role !== UserRole.PRINCIPAL) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const data = { ...body, schoolId, createdAt: new Date(), updatedAt: new Date() };
    const ref = classesCollection().doc();
    await ref.set(data);
    const created = await ref.get();
    return NextResponse.json(docToJson(created), { status: 201 });
  } catch (e) {
    console.error('POST /api/classes error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
