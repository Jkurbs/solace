import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { getDashboardAccountId, hasDashboardAccess } from '@/features/hermes-dashboard/access';
import { HermesDashboard } from '@/features/hermes-dashboard/dashboard-client';
import { getDashboardOnboardingState, getStoredRiskProfile } from '@/features/hermes-dashboard/preferences';
import { getHermesDashboardSnapshot } from '@/features/hermes-dashboard/read-model';

import DashboardAccessGate from './DashboardAccessGate';

export const metadata: Metadata = {
  title: 'Solace — Hermes Dashboard',
  description: 'A simple Hermes account dashboard focused on value, status, allocation, activity, and commentary.',
};

async function getInitialDashboardSnapshot() {
  const storedRiskProfile = await getStoredRiskProfile();
  const onboarding = await getDashboardOnboardingState();
  const accountId = await getDashboardAccountId();

  return getHermesDashboardSnapshot({
    accountId,
    accountReview: onboarding.accountReview,
    depositIntentAmount: onboarding.depositIntentAmount,
    identityVerification: onboarding.identityVerification,
    lifecycle: 'AWAITING_DEPOSIT',
    riskProfile: storedRiskProfile,
  });
}

type DashboardPageProps = {
  searchParams?: Promise<{
    access?: string | string[];
  }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const accessGranted = await hasDashboardAccess();

  if (!accessGranted) {
    const params = await searchParams;
    const denied = Array.isArray(params?.access) ? params?.access.includes('denied') : params?.access === 'denied';

    return <DashboardAccessGate denied={denied} />;
  }

  const onboarding = await getDashboardOnboardingState();

  if (!onboarding.complete) {
    redirect('/dashboard/onboarding');
  }

  const initialSnapshot = await getInitialDashboardSnapshot();

  return <HermesDashboard initialSnapshot={initialSnapshot} />;
}
