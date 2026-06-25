import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const appHosts = new Set(['app.solace.fyi']);
const consoleHosts = new Set(['console.solace.fyi']);

export function middleware(request: NextRequest) {
  const host = request.headers.get('host')?.split(':')[0].toLowerCase();

  if (host && appHosts.has(host) && request.nextUrl.pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';

    return NextResponse.redirect(url);
  }

  if (host && consoleHosts.has(host) && request.nextUrl.pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/console';

    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/'],
};
