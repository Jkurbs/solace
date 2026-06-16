import { NextResponse } from 'next/server';

import { hasDashboardAccess } from '@/features/hermes-dashboard/access';
import { isRiskProfile, riskProfileCookieName } from '@/features/hermes-dashboard/preferences';
import type { RiskProfile } from '@/features/hermes-dashboard/types';

export async function POST(request: Request) {
  if (!(await hasDashboardAccess())) {
    return NextResponse.json({ message: 'Dashboard access required.' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { riskProfile?: RiskProfile } | null;
  const riskProfile = body?.riskProfile;

  if (!isRiskProfile(riskProfile)) {
    return NextResponse.json({ message: 'Invalid risk profile.' }, { status: 400 });
  }

  const response = NextResponse.json({ riskProfile });
  response.cookies.set(riskProfileCookieName, riskProfile, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });

  return response;
}
