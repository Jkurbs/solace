import { NextResponse } from 'next/server';

import { hasDashboardAccess } from '@/features/hermes-dashboard/access';
import { getDashboardOnboardingState, getStoredRiskProfile } from '@/features/hermes-dashboard/preferences';
import { getHermesDashboardSnapshot } from '@/features/hermes-dashboard/read-model';

export async function GET() {
  if (!(await hasDashboardAccess())) {
    return NextResponse.json({ message: 'Dashboard access required.' }, { status: 401 });
  }

  const riskProfile = await getStoredRiskProfile();
  const onboarding = await getDashboardOnboardingState();

  if (!onboarding.complete) {
    return NextResponse.json({ message: 'Dashboard onboarding required.' }, { status: 409 });
  }

  const snapshot = await getHermesDashboardSnapshot({
    depositIntentAmount: onboarding.depositIntentAmount,
    lifecycle: 'AWAITING_DEPOSIT',
    riskProfile,
  });

  return NextResponse.json(snapshot);
}
