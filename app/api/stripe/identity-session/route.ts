import { NextResponse } from 'next/server';

import { hasDashboardAccess } from '@/features/hermes-dashboard/access';
import {
  getDashboardOnboardingState,
  getStoredRiskProfile,
  setIdentityVerificationPreference,
} from '@/features/hermes-dashboard/preferences';
import { getStripeServerClient } from '@/lib/stripe/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!(await hasDashboardAccess())) {
    return NextResponse.json({ message: 'Dashboard access required.' }, { status: 401 });
  }

  const onboarding = await getDashboardOnboardingState();

  if (!onboarding.complete || !onboarding.accountReview) {
    return NextResponse.json({ message: 'Account review is required before verification.' }, { status: 409 });
  }

  const stripe = getStripeServerClient();

  if (!stripe) {
    return NextResponse.json({
      message: 'Stripe Identity is not configured yet. Verification remains pending.',
    });
  }

  const riskProfile = await getStoredRiskProfile();

  try {
    const verificationSession = await stripe.identity.verificationSessions.create({
      metadata: {
        account_type: onboarding.accountReview.accountType,
        country: onboarding.accountReview.country,
        deposit_range: onboarding.accountReview.intendedDepositRange,
        risk_profile: riskProfile ?? 'Balanced',
        source_of_funds: onboarding.accountReview.sourceOfFunds,
      },
      return_url: new URL('/dashboard?identity=returned', request.url).toString(),
      type: 'document',
    });

    const response = NextResponse.json({
      message: 'Opening Stripe Identity verification.',
      url: verificationSession.url,
    });

    setIdentityVerificationPreference(response, {
      provider: 'stripe_identity',
      sessionId: verificationSession.id,
      status: 'SESSION_CREATED',
      updatedAt: new Date().toISOString(),
    });

    return response;
  } catch (error) {
    console.warn('[stripe-identity] Session creation failed.', error);

    return NextResponse.json(
      { message: 'Identity verification could not be started. Please try again later.' },
      { status: 502 },
    );
  }
}
