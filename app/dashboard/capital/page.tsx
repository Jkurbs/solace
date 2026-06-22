import type { Metadata } from 'next';

import { getDashboardAccountId, hasDashboardAccess } from '@/features/hermes-dashboard/access';
import { MoneyMovementPage } from '@/features/hermes-dashboard/money-movement-client';
import { getDashboardOnboardingState, getStoredRiskProfile } from '@/features/hermes-dashboard/preferences';
import { getHermesDashboardSnapshot } from '@/features/hermes-dashboard/read-model';

import DashboardAccessGate from '../DashboardAccessGate';

export const metadata: Metadata = {
  title: 'Solace - Move Capital',
  description: 'Deposit capital, request withdrawals, and track Solace treasury status for Hermes.',
};

export const dynamic = 'force-dynamic';

type CapitalPageProps = {
  searchParams?: Promise<{
    auth?: string | string[];
    email?: string | string[];
  }>;
};

async function getInitialDashboardSnapshot() {
  const accountId = await getDashboardAccountId();
  const storedRiskProfile = await getStoredRiskProfile(accountId);
  const onboarding = await getDashboardOnboardingState(accountId);

  return getHermesDashboardSnapshot({
    accountId,
    accountReview: onboarding.accountReview,
    depositIntentAmount: onboarding.depositIntentAmount,
    identityVerification: onboarding.identityVerification,
    lifecycle: 'AWAITING_DEPOSIT',
    riskProfile: storedRiskProfile,
  });
}

export default async function CapitalPage({ searchParams }: CapitalPageProps) {
  const accessGranted = await hasDashboardAccess();

  if (!accessGranted) {
    const params = await searchParams;
    const status = Array.isArray(params?.auth) ? params.auth[0] : params?.auth;
    const email = Array.isArray(params?.email) ? params.email[0] : params?.email;

    return (
      <DashboardAccessGate
        email={email}
        status={status === 'denied' || status === 'expired' || status === 'failed' || status === 'invalid' || status === 'sent' ? status : undefined}
      />
    );
  }

  const initialSnapshot = await getInitialDashboardSnapshot();

  return <MoneyMovementPage initialSnapshot={initialSnapshot} />;
}
