import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight } from 'lucide-react';

import Mark from '@/app/Mark';
import DashboardThemeShell from '@/app/dashboard/DashboardThemeShell';
import RiskProfileSelector from '@/app/dashboard/onboarding/risk-profile-selector';
import {
  getDashboardAccountId,
  hasDashboardAccess,
  isGuestDashboardAccess,
} from '@/features/hermes-dashboard/access';
import { getDashboardOnboardingState, getStoredRiskProfile } from '@/features/hermes-dashboard/preferences';

export const metadata: Metadata = {
  title: 'Solace · Enter Hermes Simulation',
  description: 'Start Hermes with simulation capital. Performance tracks the live instrument; no real money moves.',
};

export const dynamic = 'force-dynamic';

type DashboardOnboardingPageProps = {
  searchParams?: Promise<{
    setup?: string | string[];
    welcome?: string | string[];
  }>;
};

export default async function DashboardOnboardingPage({ searchParams }: DashboardOnboardingPageProps) {
  const accessGranted = await hasDashboardAccess();

  if (!accessGranted) {
    redirect('/dashboard');
  }

  const params = await searchParams;
  const invalid = Array.isArray(params?.setup) ? params?.setup.includes('invalid') : params?.setup === 'invalid';
  const unavailable =
    Array.isArray(params?.setup) ? params?.setup.includes('unavailable') : params?.setup === 'unavailable';
  const accountId = await getDashboardAccountId();
  const onboarding = await getDashboardOnboardingState(accountId);
  const storedRiskProfile = (await getStoredRiskProfile(accountId)) ?? 'Balanced';
  const guestOpen = isGuestDashboardAccess() && !accountId;

  if (onboarding.complete) {
    redirect('/dashboard');
  }

  // Open simulation path (default product entry from Enter Hermes).
  if (guestOpen) {
    return (
      <DashboardThemeShell>
        <header className="border-b border-neutral-200 bg-[#f7f5ef]/90 backdrop-blur dark:border-neutral-800 dark:bg-[#0a0a0a]/90">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
            <Link href="/" className="solace-wordmark text-neutral-950 dark:text-neutral-50">
              <Mark size={22} />
              Solace
            </Link>
            <Link
              href="/hermes"
              className="text-sm font-bold text-neutral-600 transition-colors hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-neutral-50"
            >
              Hermes
            </Link>
          </div>
        </header>

        <section className="mx-auto grid max-w-3xl gap-10 px-5 py-12 sm:py-16">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.16em] text-neutral-500">Simulation</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-normal text-neutral-950 dark:text-neutral-50 sm:text-5xl">
              Enter Hermes with simulation capital.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-neutral-600 dark:text-neutral-400">
              You can use Hermes now, no application. We will deposit virtual capital into your account so you
              can watch how Hermes waits, deploys, and records decisions.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-[#0d0d0b]">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-neutral-500">What is real</p>
              <p className="mt-3 text-sm leading-6 text-neutral-700 dark:text-neutral-300">
                Hermes decisions, posture, and outcomes track the live instrument, the same process sealed on the
                public ledger for founder capital.
              </p>
            </div>
            <div className="rounded-lg border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-[#0d0d0b]">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-neutral-500">What is simulated</p>
              <p className="mt-3 text-sm leading-6 text-neutral-700 dark:text-neutral-300">
                Your balance is virtual. <strong className="font-semibold text-neutral-950 dark:text-neutral-50">No real money moves.</strong>{' '}
                Simulation capital is deposited so you can experience the product without financial risk.
              </p>
            </div>
          </div>

          <form action="/api/dashboard/onboarding/open-simulation" method="post" className="grid gap-6">
            {invalid ? (
              <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
                Confirm that you understand simulation capital before continuing.
              </p>
            ) : null}
            {unavailable ? (
              <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
                That risk profile is not available in this beta. Choose Balanced for now.
              </p>
            ) : null}

            <div className="rounded-lg border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-[#0d0d0b]">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-neutral-500">Risk profile</p>
              <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                Hermes will respect this bound for your simulation.
              </p>
              <div className="mt-4">
                <RiskProfileSelector initialRiskProfile={storedRiskProfile} />
              </div>
            </div>

            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-5 dark:border-neutral-800 dark:bg-neutral-950/40">
              <p className="text-sm font-medium text-neutral-950 dark:text-neutral-50">
                Simulation capital: $10,000
              </p>
              <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                Posted to your simulation account when you continue. You can explore Hermes immediately after.
              </p>
            </div>

            <label className="grid cursor-pointer grid-cols-[1.75rem_1fr] gap-4 rounded-md border border-neutral-200 bg-white p-4 text-sm leading-6 text-neutral-700 dark:border-neutral-800 dark:bg-[#0d0d0b] dark:text-neutral-300">
              <input name="simAcknowledged" type="checkbox" required className="mt-1 h-4 w-4" />
              <span>
                I understand that <strong className="font-semibold">Hermes performance reflects the live instrument</strong>, and that{' '}
                <strong className="font-semibold">my capital is simulated</strong>, no real money is deposited or
                at risk. Real capital remains limited and requires a separate request when I am ready.
              </span>
            </label>

            <button
              type="submit"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-neutral-950 px-6 text-sm font-semibold text-neutral-50 transition-opacity hover:opacity-90 dark:bg-neutral-50 dark:text-neutral-950"
            >
              Enter simulation
              <ArrowRight size={16} aria-hidden="true" />
            </button>

            <p className="text-center text-xs text-neutral-500">
              Prefer to watch first?{' '}
              <Link href="/observatory/hermes/ledger" className="underline underline-offset-4">
                Inspect the public ledger
              </Link>
              .
            </p>
          </form>
        </section>
      </DashboardThemeShell>
    );
  }

  // Authenticated accounts still use the existing full setup path elsewhere.
  redirect('/dashboard');
}
