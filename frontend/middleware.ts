import { NextRequest, NextResponse } from 'next/server';

const PLATFORM_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  'kitschool.vercel.app',
  'kitschool-frontend.vercel.app',
]);

export async function middleware(request: NextRequest) {
  const host = (request.headers.get('host') || '').toLowerCase().split(':')[0];
  if (!host || PLATFORM_HOSTS.has(host) || host.endsWith('.vercel.app')) {
    return NextResponse.next();
  }

  if (request.nextUrl.pathname.startsWith('/school/')) {
    return NextResponse.next();
  }

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

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
