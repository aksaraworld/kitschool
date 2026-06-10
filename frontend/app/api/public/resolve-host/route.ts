/**
 * Resolve custom domain → school (landing slug + branding for login).
 */
import { NextRequest, NextResponse } from 'next/server';
import { resolveSchoolByHost } from '@/lib/server/custom-domain';
import { isPlatformHost, normalizeHost } from '@/lib/platform-hosts';

export async function GET(req: NextRequest) {
  try {
    const host = normalizeHost(req.nextUrl.searchParams.get('host') || '');
    if (!host || isPlatformHost(host)) {
      return NextResponse.json({ slug: null, schoolId: null });
    }

    const school = await resolveSchoolByHost(host);
    if (!school) {
      return NextResponse.json({ slug: null, schoolId: null });
    }

    return NextResponse.json({
      slug: school.slug,
      schoolId: school.schoolId,
      name: school.name,
      shortName: school.shortName ?? null,
      logo: school.logo ?? null,
      tagline: school.tagline ?? null,
    });
  } catch (e) {
    console.error('GET /api/public/resolve-host error:', e);
    return NextResponse.json({ slug: null, schoolId: null });
  }
}
