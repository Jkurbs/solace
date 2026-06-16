import { NextResponse } from 'next/server';

import { grantDashboardAccess, isValidDashboardAccessCode } from '@/features/hermes-dashboard/access';
import { getDashboardOnboardingState } from '@/features/hermes-dashboard/preferences';

export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null);
  const code = formData?.get('code');
  const dashboardUrl = new URL('/dashboard', request.url);

  if (typeof code !== 'string' || !isValidDashboardAccessCode(code)) {
    dashboardUrl.searchParams.set('access', 'denied');
    return NextResponse.redirect(dashboardUrl, 303);
  }

  const onboarding = await getDashboardOnboardingState();
  const nextUrl = new URL(onboarding.complete ? '/dashboard' : '/dashboard/onboarding', request.url);
  const response = NextResponse.redirect(nextUrl, 303);
  grantDashboardAccess(response);

  return response;
}
