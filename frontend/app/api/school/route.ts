/**
 * Serverless GET/PUT/POST /api/school – current user's school (from x-school-id or auth.schoolId).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import { schoolsCollection, docToJson } from '@/lib/server/firebase-admin';
import { UserRole } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    // Principal/Staff: use their assigned school so profile page always works (ignore header)
    const schoolId =
      auth.role !== UserRole.SAAS_ADMIN && auth.schoolId
        ? auth.schoolId
        : getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    if (auth.role !== UserRole.SAAS_ADMIN && auth.schoolId !== schoolId) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const snap = await schoolsCollection().doc(schoolId).get();
    if (!snap.exists) return NextResponse.json({ message: 'School profile not found' }, { status: 404 });
    return NextResponse.json(docToJson(snap));
  } catch (e) {
    console.error('GET /api/school error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (auth.role !== UserRole.PRINCIPAL && auth.role !== UserRole.STAFF) {
      return NextResponse.json({ message: 'Only Principal and Staff can update school profile' }, { status: 403 });
    }

    const schoolId =
      auth.role !== UserRole.SAAS_ADMIN && auth.schoolId
        ? auth.schoolId
        : getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const updateData = { ...body };
    delete updateData.subscriptionStatus;
    delete updateData.subscriptionStartDate;
    delete updateData.subscriptionEndDate;
    delete updateData.subscriptionFeePerStudent;
    delete updateData.settlementAccount;
    delete updateData.createdBy;
    delete updateData.isActive;
    updateData.updatedAt = new Date();

    const ref = schoolsCollection().doc(schoolId);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ message: 'School profile not found' }, { status: 404 });
    await ref.set({ ...updateData, updatedAt: new Date() }, { merge: true });
    const updated = await ref.get();
    return NextResponse.json(docToJson(updated));
  } catch (e) {
    console.error('PUT /api/school error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (auth.role !== UserRole.PRINCIPAL && auth.role !== UserRole.STAFF) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const schoolId =
      auth.role !== UserRole.SAAS_ADMIN && auth.schoolId
        ? auth.schoolId
        : getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const ref = schoolsCollection().doc(schoolId);
    await ref.set({ ...body, updatedAt: new Date() }, { merge: true });
    const updated = await ref.get();
    return NextResponse.json(docToJson(updated));
  } catch (e) {
    console.error('POST /api/school error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
