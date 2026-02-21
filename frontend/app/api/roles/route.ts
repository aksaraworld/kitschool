/**
 * Serverless GET/POST /api/roles – list and create role definitions. Kepala Sekolah only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId, hasFullAccess } from '@/lib/server/auth-helpers';
import { roleDefinitionsCollection, docToJson } from '@/lib/server/firebase-admin';
import { UserRole, ROLE_LABELS, ROLE_PAGES, ROLE_RESOURCES, ROLE_APPROVALS } from '@/lib/types';

const DEFAULT_RESOURCE = { create: false, read: false, update: false, delete: false };

function defaultPermissions() {
  const resources: Record<string, { create: boolean; read: boolean; update: boolean; delete: boolean }> = {};
  ROLE_RESOURCES.forEach((r) => { resources[r.key] = { ...DEFAULT_RESOURCE }; });
  return {
    pageAccess: [] as string[],
    approvals: [] as string[],
    resources,
  };
}

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!hasFullAccess(auth)) {
      return NextResponse.json({ message: 'Only Kepala Sekolah can manage roles' }, { status: 403 });
    }

    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const snap = await roleDefinitionsCollection().where('schoolId', '==', schoolId).get();
    let roles = snap.docs.map((d) => docToJson(d) as Record<string, unknown>);

    if (roles.length === 0) {
      const defaults = Object.entries(ROLE_LABELS)
        .filter(([k]) => !['saas_admin', 'student', 'parent'].includes(k))
        .map(([roleKey, displayName], i) => ({
          _id: `default-${roleKey}`,
          id: `default-${roleKey}`,
          schoolId,
          roleKey,
          displayName,
          permissions: defaultPermissions(),
          isDefault: true,
          order: i,
        }));
      return NextResponse.json(defaults);
    }

    return NextResponse.json(roles);
  } catch (e) {
    console.error('GET /api/roles error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!hasFullAccess(auth)) {
      return NextResponse.json({ message: 'Only Kepala Sekolah can manage roles' }, { status: 403 });
    }

    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const { roleKey, displayName, permissions } = body;
    if (!roleKey || !displayName) {
      return NextResponse.json({ message: 'roleKey and displayName required' }, { status: 400 });
    }

    const existing = await roleDefinitionsCollection()
      .where('schoolId', '==', schoolId)
      .where('roleKey', '==', roleKey)
      .get();
    if (!existing.empty) {
      return NextResponse.json({ message: 'Role key already exists for this school' }, { status: 400 });
    }

    const perm = permissions ?? defaultPermissions();
    const data = {
      schoolId,
      roleKey: String(roleKey).trim(),
      displayName: String(displayName).trim(),
      permissions: {
        pageAccess: Array.isArray(perm.pageAccess) ? perm.pageAccess : [],
        approvals: Array.isArray(perm.approvals) ? perm.approvals : [],
        resources: perm.resources && typeof perm.resources === 'object' ? perm.resources : defaultPermissions().resources,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const ref = roleDefinitionsCollection().doc();
    await ref.set(data);
    const created = await ref.get();
    return NextResponse.json(docToJson(created), { status: 201 });
  } catch (e) {
    console.error('POST /api/roles error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
