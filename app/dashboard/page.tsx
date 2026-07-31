import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import {
  getDashboardAccountId,
  hasDashboardAccess,
  isGuestDashboardAccess,
} from '@/features/hermes-dashboard/access';
import { HermesDashboard } from '@/features/hermes-dashboard/dashboard-client';
import {
  getDashboardOnboardingState,
  getStoredRiskProfile,
  type DashboardOnboardingState,
} from '@/features/hermes-dashboard/preferences';
import {
  getHermesDashboardSnapshot,
  getOpenSimulationDashboardSnapshot,
} from '@/features/hermes-dashboard/read-model';
import { isDashboardOnboardingRequired } from '@/features/hermes-dashboard/setup';

import DashboardAccessGate from './DashboardAccessGate';

export const metadata: Metadata = {
  title: 'Solace · Hermes Dashboard',
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
    next?: string | string[];
  }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const accessGranted = await hasDashboardAccess();

  if (!accessGranted) {
    const params = await searchParams;
    const status = Array.isArray(params?.auth) ? params.auth[0] : params?.auth;
    const email = Array.isArray(params?.email) ? params.email[0] : params?.email;
    const nextPath = Array.isArray(params?.next) ? params.next[0] : params?.next;

    return (
      <DashboardAccessGate
        email={email}
        nextPath={nextPath}
        status={
          status === 'denied' ||
          status === 'expired' ||
          status === 'failed' ||
          status === 'invalid' ||
          status === 'sent'
            ? status
            : undefined
        }
      />
    );
  }

  const accountId = await getDashboardAccountId();
  const onboarding = await getDashboardOnboardingState(accountId);
  const guestOpen = isGuestDashboardAccess() && !accountId;

  // Onboarding is parked: users land on the dashboard. Routes/UI under
  // /dashboard/onboarding remain available if re-enabled.
  if (isDashboardOnboardingRequired() && !onboarding.complete) {
    redirect('/dashboard/onboarding?welcome=1');
  }

  // Guest simulation: show active sim capital without a ledger account invite.
  // When onboarding is parked, open sim is the default entry (no welcome sheet).
  if (guestOpen) {
    const riskProfile = (await getStoredRiskProfile(accountId)) ?? 'Balanced';
    const initialSnapshot = getOpenSimulationDashboardSnapshot({
      depositAmount: onboarding.depositIntentAmount ?? 10_000,
      riskProfile,
    });

    return <HermesDashboard initialSnapshot={initialSnapshot} />;
  }

  const initialSnapshot = await getInitialDashboardSnapshot({ accountId, onboarding });

  return <HermesDashboard initialSnapshot={initialSnapshot} />;
}
