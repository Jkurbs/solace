import type { Metadata } from 'next';

import { hasDashboardAccess } from '@/features/hermes-dashboard/access';
import { HermesDashboard } from '@/features/hermes-dashboard/dashboard-client';
import { getStoredRiskProfile } from '@/features/hermes-dashboard/preferences';
import { getHermesDashboardSnapshot } from '@/features/hermes-dashboard/read-model';

import DashboardAccessGate from './DashboardAccessGate';

export const metadata: Metadata = {
  title: 'Solace — Hermes Dashboard',
  description: 'A simple Hermes account dashboard focused on value, status, allocation, activity, and commentary.',
};

async function getInitialDashboardSnapshot() {
  const storedRiskProfile = await getStoredRiskProfile();

  return getHermesDashboardSnapshot({ riskProfile: storedRiskProfile });
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

  const initialSnapshot = await getInitialDashboardSnapshot();

  return <HermesDashboard initialSnapshot={initialSnapshot} />;
}
