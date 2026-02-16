/**
 * Serverless PUT /api/schools/[id]/subscription – update subscription (SaaS Admin only).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/server/auth-helpers';
import { schoolsCollection } from '@/lib/server/firebase-admin';
import { UserRole } from '@/lib/types';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (auth.role !== UserRole.SAAS_ADMIN) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const ref = schoolsCollection().doc(id);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ message: 'School not found' }, { status: 404 });

    const update: Record<string, unknown> = {
      updatedAt: new Date(),
      ...(body.subscriptionStatus !== undefined && { subscriptionStatus: body.subscriptionStatus }),
      ...(body.subscriptionPlan !== undefined && { subscriptionPlan: body.subscriptionPlan }),
      ...(body.subscriptionStartDate !== undefined && { subscriptionStartDate: body.subscriptionStartDate }),
      ...(body.subscriptionEndDate !== undefined && { subscriptionEndDate: body.subscriptionEndDate }),
    };
    await ref.update(update);
    return NextResponse.json({ message: 'Subscription updated' });
  } catch (e) {
    console.error('PUT /api/schools/[id]/subscription error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
