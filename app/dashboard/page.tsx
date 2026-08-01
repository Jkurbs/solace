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
import { getGuestSimSessionFromCookies } from '@/features/hermes-dashboard/sim-session';

import DashboardAccessGate from './DashboardAccessGate';
import SimSessionPersist from './SimSessionPersist';

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

  if (!onboarding.complete) {
    redirect('/dashboard/onboarding?welcome=1');
  }

  // Guest simulation: live book scaled to virtual capital, no ledger invite.
  if (guestOpen) {
    const riskProfile = (await getStoredRiskProfile(accountId)) ?? 'Balanced';
    const depositAmount = onboarding.depositIntentAmount ?? 10_000;
    const session = await getGuestSimSessionFromCookies({ depositAmount, riskProfile });
    const initialSnapshot = await getOpenSimulationDashboardSnapshot({
      depositAmount,
      riskProfile,
      session,
    });

    return (
      <>
        <SimSessionPersist />
        <HermesDashboard initialSnapshot={initialSnapshot} />
      </>
    );
  }

  const initialSnapshot = await getInitialDashboardSnapshot({ accountId, onboarding });

  return (
    <>
      <SimSessionPersist />
      <HermesDashboard initialSnapshot={initialSnapshot} />
    </>
  );
}
