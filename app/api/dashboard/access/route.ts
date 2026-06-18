import { NextResponse } from 'next/server';

import { getAccountOnboarding } from '@/features/accounts/store';
import { grantDashboardAccess, resolveDashboardAccessCode } from '@/features/hermes-dashboard/access';

async function getAccessDestinationPath(dashboardAccess: Awaited<ReturnType<typeof resolveDashboardAccessCode>>) {
  if (dashboardAccess?.kind !== 'invite') {
    return '/dashboard';
  }

  const onboarding = await getAccountOnboarding(dashboardAccess.accountId);

  return onboarding?.complete ? '/dashboard' : '/dashboard/onboarding';
}

async function grantAccessFromCode(request: Request, code: FormDataEntryValue | string | null) {
  const dashboardUrl = new URL('/dashboard', request.url);

  const dashboardAccess = typeof code === 'string' ? await resolveDashboardAccessCode(code) : null;

  if (!dashboardAccess) {
    dashboardUrl.searchParams.set('access', 'denied');
    return NextResponse.redirect(dashboardUrl, 303);
  }

  const nextUrl = new URL(await getAccessDestinationPath(dashboardAccess), request.url);
  const response = NextResponse.redirect(nextUrl, 303);
  grantDashboardAccess(response, dashboardAccess);

  return response;
}

export async function GET(request: Request) {
  const url = new URL(request.url);

  return grantAccessFromCode(request, url.searchParams.get('code'));
}

export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null);

  return grantAccessFromCode(request, formData?.get('code') ?? null);
}
