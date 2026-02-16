/**
 * Serverless GET /api/schools (SaaS Admin only), POST (create school).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import {
  schoolsCollection,
  usersCollection,
  getAuth,
  setUserRole,
  docToJson,
} from '@/lib/server/firebase-admin';
import { UserRole } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (auth.role !== UserRole.SAAS_ADMIN) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const status = req.nextUrl.searchParams.get('status');
    const isActiveParam = req.nextUrl.searchParams.get('isActive');

    let query = schoolsCollection();
    if (status) query = query.where('subscriptionStatus', '==', status) as ReturnType<typeof schoolsCollection>;
    if (isActiveParam !== undefined && isActiveParam !== null) {
      query = query.where('isActive', '==', isActiveParam === 'true') as ReturnType<typeof schoolsCollection>;
    }
    const snapshot = await query.get();
    const rows = snapshot.docs.map((d) => docToJson(d));
    rows.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));

    return NextResponse.json(rows);
  } catch (e) {
    console.error('GET /api/schools error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (auth.role !== UserRole.SAAS_ADMIN) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const ref = schoolsCollection().doc();
    await ref.set({
      ...body,
      createdBy: auth.uid,
      subscriptionStatus: body.subscriptionStatus || 'trial',
      subscriptionFeePerStudent: body.subscriptionFeePerStudent ?? 0,
      isActive: body.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    if (body.principalEmail && body.principalPassword) {
      const userRecord = await getAuth().createUser({
        email: body.principalEmail,
        password: body.principalPassword,
        displayName: body.principalName || 'Principal',
        disabled: false,
      });
      await setUserRole(userRecord.uid, UserRole.PRINCIPAL, ref.id);
      await usersCollection().doc(userRecord.uid).set({
        email: body.principalEmail,
        name: body.principalName || 'Principal',
        role: UserRole.PRINCIPAL,
        schoolId: ref.id,
        phone: body.principalPhone || null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    const created = await ref.get();
    return NextResponse.json(docToJson(created), { status: 201 });
  } catch (e: unknown) {
    console.error('POST /api/schools error:', e);
    return NextResponse.json({ message: (e as Error).message || 'Server error' }, { status: 500 });
  }
}
