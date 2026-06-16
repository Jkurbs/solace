import { NextResponse } from 'next/server';

import { hasDashboardAccess } from '@/features/hermes-dashboard/access';
import {
  completeDashboardOnboarding,
  isRiskProfile,
  parseDepositIntentAmount,
} from '@/features/hermes-dashboard/preferences';
import type { RiskProfile } from '@/features/hermes-dashboard/types';

export async function POST(request: Request) {
  if (!(await hasDashboardAccess())) {
    return NextResponse.redirect(new URL('/dashboard', request.url), 303);
  }

  const formData = await request.formData().catch(() => null);
  const riskProfile = formData?.get('riskProfile') as RiskProfile | null;
  const depositIntentAmount = parseDepositIntentAmount(formData?.get('depositIntentAmount'));

  if (!isRiskProfile(riskProfile) || !depositIntentAmount) {
    return NextResponse.redirect(new URL('/dashboard/onboarding?setup=invalid', request.url), 303);
  }

  const response = NextResponse.redirect(new URL('/dashboard', request.url), 303);
  completeDashboardOnboarding(response, { depositIntentAmount, riskProfile });

  return response;
}
