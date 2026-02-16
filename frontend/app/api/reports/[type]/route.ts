/**
 * Serverless GET /api/reports/[type] – stub; returns empty data for serverless.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const { type } = await params;
    // Stub: return empty report structure. Replace with real aggregation when needed.
    return NextResponse.json({
      type,
      schoolId,
      data: [],
      generatedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error('GET /api/reports/[type] error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
