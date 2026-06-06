/**
 * Serverless GET/PUT /api/schools/[id]. PUT /api/schools/[id]/subscription in same file via body.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import { schoolsCollection, docToJson } from '@/lib/server/firebase-admin';
import { UserRole } from '@/lib/types';

const SAAS_PROFILE_FIELDS = [
  'name',
  'shortName',
  'address',
  'city',
  'district',
  'province',
  'postalCode',
  'phone',
  'email',
  'website',
  'logo',
  'description',
  'schoolType',
  'jenjang',
  'units',
  'leadership',
  'principalName',
  'principalEmail',
  'principalPhone',
  'establishedYear',
  'accreditation',
  'taxId',
  'customDomain',
  'landingPage',
  'modules',
  'boardingConfig',
] as const;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    if (auth.role !== UserRole.SAAS_ADMIN && auth.schoolId !== id) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const snap = await schoolsCollection().doc(id).get();
    if (!snap.exists) return NextResponse.json({ message: 'School not found' }, { status: 404 });
    return NextResponse.json(docToJson(snap));
  } catch (e) {
    console.error('GET /api/schools/[id] error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    // Subscription update (SaaS Admin only)
    if (body.subscriptionStatus !== undefined || body.subscriptionPlan !== undefined) {
      if (auth.role !== UserRole.SAAS_ADMIN) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      const ref = schoolsCollection().doc(id);
      const snap = await ref.get();
      if (!snap.exists) return NextResponse.json({ message: 'School not found' }, { status: 404 });
      const update: Record<string, unknown> = { updatedAt: new Date() };
      if (body.subscriptionStatus !== undefined) update.subscriptionStatus = body.subscriptionStatus;
      if (body.subscriptionPlan !== undefined) update.subscriptionPlan = body.subscriptionPlan;
      if (body.subscriptionStartDate !== undefined) update.subscriptionStartDate = body.subscriptionStartDate;
      if (body.subscriptionEndDate !== undefined) update.subscriptionEndDate = body.subscriptionEndDate;
      await ref.update(update);
      return NextResponse.json({ message: 'Subscription updated' });
    }

    // Toggle isActive (SaaS Admin only)
    if (typeof body.isActive === 'boolean') {
      if (auth.role !== UserRole.SAAS_ADMIN) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      await schoolsCollection().doc(id).update({ isActive: body.isActive, updatedAt: new Date() });
      return NextResponse.json({ message: 'Updated' });
    }

    // Full school profile (SaaS Admin only)
    const hasProfileUpdate = SAAS_PROFILE_FIELDS.some((field) => body[field] !== undefined);
    if (hasProfileUpdate) {
      if (auth.role !== UserRole.SAAS_ADMIN) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      const ref = schoolsCollection().doc(id);
      const snap = await ref.get();
      if (!snap.exists) return NextResponse.json({ message: 'School not found' }, { status: 404 });
      const update: Record<string, unknown> = { updatedAt: new Date() };
      for (const field of SAAS_PROFILE_FIELDS) {
        if (body[field] !== undefined) update[field] = body[field];
      }
      await ref.update(update);
      const updated = await ref.get();
      return NextResponse.json(docToJson(updated));
    }

    return NextResponse.json({ message: 'No valid update' }, { status: 400 });
  } catch (e) {
    console.error('PUT /api/schools/[id] error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
