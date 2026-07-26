import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const appHosts = new Set(['app.solace.fyi']);
const consoleHosts = new Set(['console.solace.fyi']);
const docsHosts = new Set(['docs.solace.fyi']);

export function middleware(request: NextRequest) {
  const host = request.headers.get('host')?.split(':')[0].toLowerCase();
  const { pathname } = request.nextUrl;

  if (host && appHosts.has(host) && pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';

    return NextResponse.redirect(url);
  }

  if (host && consoleHosts.has(host) && pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/console';

    return NextResponse.redirect(url);
  }

  // docs.solace.fyi — public API reference UI (not the JSON handlers under /api/*).
  if (host && docsHosts.has(host)) {
    // Exact /api is the docs landing page; nested /api/hermes/* stays real API routes.
    if (pathname === '/' || pathname === '/api') {
      const url = request.nextUrl.clone();
      url.pathname = '/docs/api';

      return NextResponse.rewrite(url);
    }

    // Legacy marketing path → docs API landing.
    if (pathname === '/hermes/market' || pathname === '/docs' || pathname === '/docs/') {
      const url = request.nextUrl.clone();
      url.pathname = '/docs/api';

      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/api', '/api/', '/hermes/market', '/docs', '/docs/'],
};
