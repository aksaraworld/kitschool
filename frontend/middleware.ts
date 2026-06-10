import { NextRequest, NextResponse } from 'next/server';
import { getPlatformUrl, isPlatformHost, normalizeHost } from '@/lib/platform-hosts';

export async function middleware(request: NextRequest) {
  const host = normalizeHost(request.headers.get('host') || '');
  if (!host || isPlatformHost(host)) {
    return NextResponse.next();
  }

  const { pathname, search } = request.nextUrl;

  // SaaS admin only on platform domain (kitschool.vercel.app)
  if (pathname === '/saas' || pathname.startsWith('/saas/')) {
    return NextResponse.redirect(new URL(`${pathname}${search}`, getPlatformUrl()));
  }

  // Custom domain root → public school landing page
  if (pathname === '/') {
    try {
      const resolveUrl = new URL('/api/public/resolve-host', request.url);
      resolveUrl.searchParams.set('host', host);
      const res = await fetch(resolveUrl.toString());
      const data = (await res.json()) as { slug?: string | null };
      if (data.slug) {
        return NextResponse.rewrite(new URL(`/school/${data.slug}`, request.url));
      }
    } catch {
      // fall through
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
