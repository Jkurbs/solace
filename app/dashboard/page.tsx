import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';

import Mark from '@/app/Mark';
import { hasDashboardAccess } from '@/features/hermes-dashboard/access';
import { HermesDashboard } from '@/features/hermes-dashboard/dashboard-client';
import { hermesDashboardSnapshot } from '@/features/hermes-dashboard/mock-data';
import type { HermesDashboardSnapshot, RiskProfile } from '@/features/hermes-dashboard/types';
import { createSupabaseServerClient, isSupabaseServerConfigured } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Solace — Hermes Dashboard',
  description: 'A simple Hermes account dashboard focused on value, status, allocation, activity, and commentary.',
};

const riskProfiles = new Set<RiskProfile>(['Preservation', 'Balanced', 'Velocity']);

async function getStoredRiskProfile() {
  const cookieStore = await cookies();
  const riskProfile = cookieStore.get('hermes_risk_profile')?.value as RiskProfile | undefined;

  return riskProfile && riskProfiles.has(riskProfile) ? riskProfile : null;
}

function applyRiskProfile(snapshot: HermesDashboardSnapshot, riskProfile: RiskProfile | null) {
  if (!riskProfile) {
    return snapshot;
  }

  return {
    ...snapshot,
    status: {
      ...snapshot.status,
      riskProfile,
    },
  };
}

function DashboardAccessGate({ denied = false }: { denied?: boolean }) {
  return (
    <main className="min-h-screen bg-[#10100e] text-neutral-50">
      <header className="border-b border-neutral-800 bg-[#10100e]/90">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-50">
            <Mark size={22} />
            Solace
          </Link>
          <Link href="/hermes" className="text-sm text-neutral-400 transition-colors hover:text-neutral-50">
            Hermes
          </Link>
        </div>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-73px)] max-w-md place-items-center px-5 py-16">
        <form
          action="/api/dashboard/access"
          method="post"
          className="w-full rounded-lg border border-neutral-800 bg-[#181715] p-6 shadow-2xl shadow-black/20"
        >
          <p className="text-sm font-medium text-neutral-400">Hermes Dashboard</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-neutral-50">Access required</h1>
          <p className="mt-3 text-sm leading-6 text-neutral-400">
            Enter the private access code to view the dashboard.
          </p>

          <label htmlFor="dashboard-code" className="mt-6 block text-sm font-medium text-neutral-300">
            Access code
          </label>
          <input
            id="dashboard-code"
            name="code"
            type="password"
            required
            autoComplete="current-password"
            className="mt-2 h-11 w-full rounded-md border border-neutral-700 bg-[#10100e] px-3 text-base text-neutral-50 outline-none transition-colors placeholder:text-neutral-600 focus:border-neutral-400"
            placeholder="Enter code"
          />
          {denied ? (
            <p className="mt-3 text-sm text-red-300" role="alert">
              That code did not match.
            </p>
          ) : null}

          <button
            type="submit"
            className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-md bg-neutral-50 px-4 text-sm font-semibold text-neutral-950 transition-colors hover:bg-neutral-200"
          >
            Enter dashboard
          </button>
        </form>
      </section>
    </main>
  );
}

async function getInitialDashboardSnapshot() {
  const storedRiskProfile = await getStoredRiskProfile();

  if (!isSupabaseServerConfigured()) {
    return applyRiskProfile(hermesDashboardSnapshot, storedRiskProfile);
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return applyRiskProfile(hermesDashboardSnapshot, storedRiskProfile);
  }

  return applyRiskProfile(hermesDashboardSnapshot, storedRiskProfile);
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
