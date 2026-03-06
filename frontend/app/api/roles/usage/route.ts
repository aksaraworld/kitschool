/**
 * GET /api/roles/usage – count users per role. Principal only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId, hasFullAccess } from '@/lib/server/auth-helpers';
import { usersCollection } from '@/lib/server/firebase-admin';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!hasFullAccess(auth)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const snapshot = await usersCollection().where('schoolId', '==', schoolId).get();
    const countByRole: Record<string, number> = {};
    snapshot.docs.forEach((d) => {
      const data = d.data() as { role?: string; roles?: string[] };
      const roles = new Set<string>();
      if (data.role) roles.add(data.role);
      (data.roles ?? []).forEach((r: string) => roles.add(r));
      roles.forEach((r) => {
        countByRole[r] = (countByRole[r] ?? 0) + 1;
      });
    });
    return NextResponse.json(countByRole);
  } catch (e) {
    console.error('GET /api/roles/usage error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
