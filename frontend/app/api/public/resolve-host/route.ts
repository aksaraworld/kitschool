/**
 * Resolve custom domain → school landing slug (for middleware).
 */
import { NextRequest, NextResponse } from 'next/server';
import { schoolsCollection } from '@/lib/server/firebase-admin';

const PLATFORM_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  'kitschool.vercel.app',
  'kitschool-frontend.vercel.app',
]);

export async function GET(req: NextRequest) {
  try {
    const host = (req.nextUrl.searchParams.get('host') || '').toLowerCase().split(':')[0];
    if (!host || PLATFORM_HOSTS.has(host) || host.endsWith('.vercel.app')) {
      return NextResponse.json({ slug: null });
    }

    const snap = await schoolsCollection()
      .where('customDomain', '==', host)
      .where('landingPage.enabled', '==', true)
      .limit(1)
      .get();

    if (snap.empty) return NextResponse.json({ slug: null });

    const data = snap.docs[0].data();
    const slug = data.landingPage?.slug;
    return NextResponse.json({ slug: slug || null });
  } catch (e) {
    console.error('GET /api/public/resolve-host error:', e);
    return NextResponse.json({ slug: null });
  }
}
