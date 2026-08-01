import { NextResponse } from 'next/server';

import {
  getDashboardAccountId,
  hasDashboardAccess,
  isGuestDashboardAccess,
} from '@/features/hermes-dashboard/access';
import { getDashboardOnboardingState, getStoredRiskProfile } from '@/features/hermes-dashboard/preferences';
import {
  getHermesDashboardSnapshot,
  getOpenSimulationDashboardSnapshot,
} from '@/features/hermes-dashboard/read-model';
import { getGuestSimSessionFromCookies } from '@/features/hermes-dashboard/sim-session';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await hasDashboardAccess())) {
    return NextResponse.json({ message: 'Dashboard access required.' }, { status: 401 });
  }

  const accountId = await getDashboardAccountId();
  const riskProfile = (await getStoredRiskProfile(accountId)) ?? 'Balanced';
  const onboarding = await getDashboardOnboardingState(accountId);

  // Guest open-simulation: match the page SSR path so client refetch does not
  // replace a funded sim with the unfunded "ready / add capital" chapter.
  if (isGuestDashboardAccess() && !accountId) {
    const depositAmount = onboarding.depositIntentAmount ?? 10_000;
    const session = await getGuestSimSessionFromCookies({ depositAmount, riskProfile });
    return NextResponse.json(
      await getOpenSimulationDashboardSnapshot({
        depositAmount,
        riskProfile,
        session,
      }),
    );
  }

  const snapshot = await getHermesDashboardSnapshot({
    accountId,
    accountReview: onboarding.accountReview,
    depositIntentAmount: onboarding.depositIntentAmount,
    identityVerification: onboarding.identityVerification,
    lifecycle: 'AWAITING_DEPOSIT',
    riskProfile,
  });

  return NextResponse.json(snapshot);
}
