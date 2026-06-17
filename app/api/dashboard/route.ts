import { NextResponse } from 'next/server';

import { getDashboardAccountId, hasDashboardAccess } from '@/features/hermes-dashboard/access';
import { getDashboardOnboardingState, getStoredRiskProfile } from '@/features/hermes-dashboard/preferences';
import { getHermesDashboardSnapshot } from '@/features/hermes-dashboard/read-model';

export async function GET() {
  if (!(await hasDashboardAccess())) {
    return NextResponse.json({ message: 'Dashboard access required.' }, { status: 401 });
  }

  const accountId = await getDashboardAccountId();
  const riskProfile = await getStoredRiskProfile(accountId);
  const onboarding = await getDashboardOnboardingState(accountId);

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
