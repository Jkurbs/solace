import { NextResponse } from 'next/server';

import { grantConsoleAccess, isValidConsoleAccessCode } from '@/features/solace-console/access';

export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null);
  const code = formData?.get('code');
  const consoleUrl = new URL('/console', request.url);

  if (typeof code !== 'string' || !isValidConsoleAccessCode(code)) {
    consoleUrl.searchParams.set('access', 'denied');
    return NextResponse.redirect(consoleUrl, 303);
  }

  const response = NextResponse.redirect(consoleUrl, 303);
  grantConsoleAccess(response);

  return response;
}
