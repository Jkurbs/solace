import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { ArrowRight, Check, Scale, ShieldCheck, Zap } from 'lucide-react';

import Mark from '@/app/Mark';
import { getDashboardAccountId, hasDashboardAccess } from '@/features/hermes-dashboard/access';
import {
  accountTypeValues,
  intendedDepositRangeValues,
  riskProfileDescriptions,
  riskProfileValues,
  sourceOfFundsValues,
} from '@/features/hermes-dashboard/contract';
import { getDashboardOnboardingState } from '@/features/hermes-dashboard/preferences';
import type { RiskProfile } from '@/features/hermes-dashboard/types';

export const metadata: Metadata = {
  title: 'Solace — Hermes Setup',
  description: 'Set up Hermes risk profile and capital intent before entering the dashboard.',
};

const riskProfileIcons: Record<RiskProfile, typeof ShieldCheck> = {
  Balanced: Scale,
  Preservation: ShieldCheck,
  Velocity: Zap,
};

function ConsentCheckbox({ children, name }: { children: ReactNode; name: string }) {
  return (
    <label className="grid cursor-pointer grid-cols-[1.75rem_1fr] gap-4 rounded-md border border-neutral-800 bg-neutral-950/30 p-4 text-sm leading-6 text-neutral-300 transition-colors hover:border-neutral-700 hover:bg-neutral-950/50">
      <input name={name} type="checkbox" required className="peer sr-only" />
      <span className="mt-0.5 grid h-5 w-5 place-items-center rounded-md border border-neutral-500 bg-neutral-950 text-neutral-950 transition-colors peer-checked:border-neutral-50 peer-checked:bg-neutral-50 peer-checked:[&>svg]:opacity-100 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-neutral-200">
        <Check size={15} className="opacity-0 transition-opacity" aria-hidden="true" />
      </span>
      <span>{children}</span>
    </label>
  );
}

type DashboardOnboardingPageProps = {
  searchParams?: Promise<{
    setup?: string | string[];
  }>;
};

export default async function DashboardOnboardingPage({ searchParams }: DashboardOnboardingPageProps) {
  const accessGranted = await hasDashboardAccess();

  if (!accessGranted) {
    redirect('/dashboard');
  }

  const accountId = await getDashboardAccountId();
  const onboarding = await getDashboardOnboardingState(accountId);

  if (onboarding.complete) {
    redirect('/dashboard');
  }

  const params = await searchParams;
  const invalid = Array.isArray(params?.setup) ? params?.setup.includes('invalid') : params?.setup === 'invalid';

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

      <section className="mx-auto grid max-w-5xl gap-8 px-5 py-12 sm:py-16 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
        <div className="lg:sticky lg:top-8">
          <p className="text-sm font-medium uppercase tracking-[0.16em] text-neutral-500">Approved access</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-normal text-neutral-50 sm:text-5xl">
            Welcome to Hermes.
          </h1>
          <p className="mt-5 max-w-md text-sm leading-6 text-neutral-400">
            Set the account posture, complete a light review, and record capital intent before entering the dashboard.
          </p>
          <div className="mt-8 grid gap-3 text-sm text-neutral-400">
            <div className="grid grid-cols-[1.5rem_1fr] gap-3">
              <span className="font-mono text-neutral-600">01</span>
              <span>Select risk profile</span>
            </div>
            <div className="grid grid-cols-[1.5rem_1fr] gap-3">
              <span className="font-mono text-neutral-600">02</span>
              <span>Submit account review</span>
            </div>
            <div className="grid grid-cols-[1.5rem_1fr] gap-3">
              <span className="font-mono text-neutral-600">03</span>
              <span>Consent to identity verification</span>
            </div>
            <div className="grid grid-cols-[1.5rem_1fr] gap-3">
              <span className="font-mono text-neutral-600">04</span>
              <span>Record capital intent</span>
            </div>
            <div className="grid grid-cols-[1.5rem_1fr] gap-3">
              <span className="font-mono text-neutral-600">05</span>
              <span>Enter dashboard</span>
            </div>
          </div>
        </div>

        <form
          action="/api/dashboard/onboarding"
          method="post"
          className="rounded-lg border border-neutral-800 bg-[#181715] p-5 shadow-2xl shadow-black/20 sm:p-6"
        >
          <div>
            <p className="text-sm font-medium text-neutral-400">Risk Profile</p>
            <h2 className="mt-1 text-xl font-semibold text-neutral-50">Choose operating posture</h2>
            <div className="mt-5 grid gap-3">
              {riskProfileValues.map((riskProfile) => {
                const Icon = riskProfileIcons[riskProfile];

                return (
                  <label key={riskProfile} className="block cursor-pointer">
                    <input
                      className="peer sr-only"
                      type="radio"
                      name="riskProfile"
                      value={riskProfile}
                      defaultChecked={riskProfile === 'Balanced'}
                    />
                    <div className="rounded-md border border-neutral-800 bg-neutral-950/30 p-4 transition-colors peer-checked:border-neutral-200 peer-checked:bg-neutral-50 peer-checked:text-neutral-950">
                      <div className="flex items-center gap-3">
                        <Icon size={18} aria-hidden="true" />
                        <strong className="text-sm font-semibold">{riskProfile}</strong>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-inherit opacity-70">{riskProfileDescriptions[riskProfile]}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="mt-8 border-t border-neutral-800 pt-6">
            <p className="text-sm font-medium text-neutral-400">Account Review</p>
            <h2 className="mt-1 text-xl font-semibold text-neutral-50">Light profile</h2>
            <p className="mt-3 text-sm leading-6 text-neutral-400">
              Solace does not collect ID documents, SSNs, or bank details in this form.
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="legal-name" className="block text-sm font-medium text-neutral-300">
                  Legal name
                </label>
                <input
                  id="legal-name"
                  name="legalName"
                  type="text"
                  autoComplete="name"
                  required
                  className="mt-2 h-11 w-full rounded-md border border-neutral-700 bg-[#10100e] px-3 text-base text-neutral-50 outline-none transition-colors placeholder:text-neutral-600 focus:border-neutral-400"
                />
              </div>
              <div>
                <label htmlFor="account-type" className="block text-sm font-medium text-neutral-300">
                  Account type
                </label>
                <select
                  id="account-type"
                  name="accountType"
                  required
                  defaultValue="Individual"
                  className="mt-2 h-11 w-full rounded-md border border-neutral-700 bg-[#10100e] px-3 text-base text-neutral-50 outline-none transition-colors focus:border-neutral-400"
                >
                  {accountTypeValues.map((accountType) => (
                    <option key={accountType} value={accountType}>
                      {accountType}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="review-country" className="block text-sm font-medium text-neutral-300">
                  Country
                </label>
                <input
                  id="review-country"
                  name="country"
                  type="text"
                  autoComplete="country-name"
                  required
                  defaultValue="United States"
                  className="mt-2 h-11 w-full rounded-md border border-neutral-700 bg-[#10100e] px-3 text-base text-neutral-50 outline-none transition-colors placeholder:text-neutral-600 focus:border-neutral-400"
                />
              </div>
              <div>
                <label htmlFor="review-region" className="block text-sm font-medium text-neutral-300">
                  State / region
                </label>
                <input
                  id="review-region"
                  name="region"
                  type="text"
                  autoComplete="address-level1"
                  required
                  className="mt-2 h-11 w-full rounded-md border border-neutral-700 bg-[#10100e] px-3 text-base text-neutral-50 outline-none transition-colors placeholder:text-neutral-600 focus:border-neutral-400"
                />
              </div>
              <div>
                <label htmlFor="deposit-range" className="block text-sm font-medium text-neutral-300">
                  Intended range
                </label>
                <select
                  id="deposit-range"
                  name="intendedDepositRange"
                  required
                  defaultValue="$10k-$25k"
                  className="mt-2 h-11 w-full rounded-md border border-neutral-700 bg-[#10100e] px-3 text-base text-neutral-50 outline-none transition-colors focus:border-neutral-400"
                >
                  {intendedDepositRangeValues.map((range) => (
                    <option key={range} value={range}>
                      {range}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="source-of-funds" className="block text-sm font-medium text-neutral-300">
                  Source of funds
                </label>
                <select
                  id="source-of-funds"
                  name="sourceOfFunds"
                  required
                  defaultValue="Employment income"
                  className="mt-2 h-11 w-full rounded-md border border-neutral-700 bg-[#10100e] px-3 text-base text-neutral-50 outline-none transition-colors focus:border-neutral-400"
                >
                  {sourceOfFundsValues.map((source) => (
                    <option key={source} value={source}>
                      {source}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              <ConsentCheckbox name="riskAcknowledged">
                Capital deployment is subject to review and activation by Solace.
              </ConsentCheckbox>
              <ConsentCheckbox name="identityConsent">
                I consent to identity verification through Stripe Identity when verification is opened.
              </ConsentCheckbox>
            </div>
          </div>

          <div className="mt-8 border-t border-neutral-800 pt-6">
            <p className="text-sm font-medium text-neutral-400">Deposit Capital</p>
            <h2 className="mt-1 text-xl font-semibold text-neutral-50">Initial capital intent</h2>
            <p className="mt-3 text-sm leading-6 text-neutral-400">
              Capital will be reviewed before Hermes begins allocation.
            </p>

            <label htmlFor="deposit-intent-amount" className="mt-5 block text-sm font-medium text-neutral-300">
              Amount
            </label>
            <div className="mt-2 grid grid-cols-[auto_1fr] overflow-hidden rounded-md border border-neutral-700 bg-[#10100e] focus-within:border-neutral-400">
              <span className="grid h-12 place-items-center border-r border-neutral-800 px-4 text-neutral-500">$</span>
              <input
                id="deposit-intent-amount"
                name="depositIntentAmount"
                type="number"
                min="1"
                step="0.01"
                inputMode="decimal"
                required
                defaultValue="10000"
                className="h-12 w-full bg-transparent px-4 text-base text-neutral-50 outline-none placeholder:text-neutral-600"
              />
            </div>

            {invalid ? (
              <p className="mt-3 text-sm text-red-300" role="alert">
                Select a risk profile and enter a valid amount.
              </p>
            ) : null}
          </div>

          <button
            type="submit"
            className="mt-8 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-neutral-50 px-4 text-sm font-semibold text-neutral-950 transition-colors hover:bg-neutral-200"
          >
            Continue to dashboard
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        </form>
      </section>
    </main>
  );
}
