import { NextResponse } from 'next/server';

import { hasDashboardAccess, isGuestDashboardAccess } from '@/features/hermes-dashboard/access';
import { isRiskProfileAvailableForBeta } from '@/features/hermes-dashboard/contract';
import { completeOpenSimulationOnboarding, isRiskProfile } from '@/features/hermes-dashboard/preferences';
import type { RiskProfile } from '@/features/hermes-dashboard/types';

const defaultSimDeposit = 10_000;

/**
 * Open simulation welcome: no login, accept sim terms, land in dashboard with virtual capital.
 */
export async function POST(request: Request) {
  if (!(await hasDashboardAccess()) || !isGuestDashboardAccess()) {
    return NextResponse.redirect(new URL('/dashboard', request.url), 303);
  }

  const formData = await request.formData().catch(() => null);
  const acknowledged = formData?.get('simAcknowledged') === 'on';
  const riskRaw = formData?.get('riskProfile');
  const riskProfile = (typeof riskRaw === 'string' ? riskRaw : 'Balanced') as RiskProfile;

  if (!acknowledged) {
    return NextResponse.redirect(new URL('/dashboard/onboarding?setup=invalid', request.url), 303);
  }

  if (!isRiskProfile(riskProfile) || !isRiskProfileAvailableForBeta(riskProfile)) {
    return NextResponse.redirect(new URL('/dashboard/onboarding?setup=unavailable', request.url), 303);
  }

  const response = NextResponse.redirect(new URL('/dashboard', request.url), 303);
  completeOpenSimulationOnboarding(response, {
    depositAmount: defaultSimDeposit,
    riskProfile,
  });

  return response;
}
