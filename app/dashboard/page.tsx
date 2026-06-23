import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { getDashboardAccountId, hasDashboardAccess } from '@/features/hermes-dashboard/access';
import { HermesDashboard } from '@/features/hermes-dashboard/dashboard-client';
import {
  getDashboardOnboardingState,
  getStoredRiskProfile,
  type DashboardOnboardingState,
} from '@/features/hermes-dashboard/preferences';
import { getHermesDashboardSnapshot } from '@/features/hermes-dashboard/read-model';

import DashboardAccessGate from './DashboardAccessGate';

export const metadata: Metadata = {
  title: 'Solace — Hermes Dashboard',
  description: 'A simple Hermes account dashboard focused on value, status, allocation, activity, and commentary.',
};

export const dynamic = 'force-dynamic';

async function getInitialDashboardSnapshot({
  accountId,
  onboarding,
}: {
  accountId: string | null;
  onboarding: DashboardOnboardingState;
}) {
  const storedRiskProfile = await getStoredRiskProfile(accountId);

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
    auth?: string | string[];
    email?: string | string[];
  }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const accessGranted = await hasDashboardAccess();

  if (!accessGranted) {
    const params = await searchParams;
    const status = Array.isArray(params?.auth) ? params.auth[0] : params?.auth;
    const email = Array.isArray(params?.email) ? params.email[0] : params?.email;

    return <DashboardAccessGate email={email} status={status === 'denied' || status === 'expired' || status === 'failed' || status === 'invalid' || status === 'sent' ? status : undefined} />;
  }

  const accountId = await getDashboardAccountId();
  const onboarding = await getDashboardOnboardingState(accountId);

  if (!onboarding.complete) {
    redirect('/dashboard/onboarding?welcome=1');
  }

  const initialSnapshot = await getInitialDashboardSnapshot({ accountId, onboarding });

  return <HermesDashboard initialSnapshot={initialSnapshot} />;
}
