import { NextResponse } from 'next/server';

import { ensureApprovedAccountRecordsForAccountId } from '@/features/access-review/store';
import { getDashboardAccountId, hasDashboardAccess } from '@/features/hermes-dashboard/access';
import { isRiskProfileAvailableForBeta } from '@/features/hermes-dashboard/contract';
import {
  buildAccountReview,
  completeDashboardOnboarding,
  completePersistedDashboardOnboarding,
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
  const accountReview = formData ? buildAccountReview(formData) : null;
  const depositIntentAmount = formData ? parseDepositIntentAmount(formData.get('depositIntentAmount')) : null;

  if (!isRiskProfile(riskProfile) || !accountReview || !depositIntentAmount) {
    return NextResponse.redirect(new URL('/dashboard/onboarding?setup=invalid', request.url), 303);
  }

  if (!isRiskProfileAvailableForBeta(riskProfile)) {
    return NextResponse.redirect(new URL('/dashboard/onboarding?setup=unavailable', request.url), 303);
  }

  const accountId = await getDashboardAccountId();

  if (accountId) {
    await ensureApprovedAccountRecordsForAccountId(accountId);
    await completePersistedDashboardOnboarding(accountId, { accountReview, depositIntentAmount, riskProfile });
  }

  const response = NextResponse.redirect(new URL('/dashboard', request.url), 303);
  completeDashboardOnboarding(response, { accountReview, depositIntentAmount, riskProfile });

  return response;
}
