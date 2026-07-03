import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { ArrowRight, Check } from 'lucide-react';

import Mark from '@/app/Mark';
import RiskProfileSelector from '@/app/dashboard/onboarding/risk-profile-selector';
import { findApprovedAccessRequestByAccountId } from '@/features/access-review/store';
import type { HermesAccessRequest } from '@/features/access-review/types';
import { getDashboardAccountId, hasDashboardAccess } from '@/features/hermes-dashboard/access';
import {
  accountTypeValues,
  intendedDepositRangeValues,
  sourceOfFundsValues,
} from '@/features/hermes-dashboard/contract';
import { getDashboardOnboardingState, getStoredRiskProfile } from '@/features/hermes-dashboard/preferences';
import type { AccountReview, AccountType, IntendedDepositRange, RiskProfile, SourceOfFunds } from '@/features/hermes-dashboard/types';

export const metadata: Metadata = {
  title: 'Solace — Hermes Setup',
  description: 'Set up Hermes risk profile and capital intent before entering the dashboard.',
};

export const dynamic = 'force-dynamic';

function getMatchedValue<T extends string>(values: readonly T[], value: string | undefined, fallback: T) {
  return values.includes(value as T) ? (value as T) : fallback;
}

function getInitialRiskProfile(objective: string | undefined): RiskProfile {
  const normalizedObjective = objective?.toLowerCase() ?? '';

  if (normalizedObjective.includes('preservation') || normalizedObjective.includes('monitoring')) {
    return 'Preservation';
  }

  if (normalizedObjective.includes('growth') || normalizedObjective.includes('conviction')) {
    return 'Velocity';
  }

  return 'Balanced';
}

function getDepositAmountFromRange(range: IntendedDepositRange) {
  switch (range) {
    case '$10k-$25k':
      return '10000';
    case '$25k-$100k':
      return '25000';
    case '$100k-$250k':
      return '100000';
    case '$250k+':
      return '250000';
  }
}

function joinProfileParts(parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(' · ');
}

function getInitialReviewValues({
  approvedProfile,
  existingDepositIntentAmount,
  existingReview,
  existingRiskProfile,
}: {
  approvedProfile: HermesAccessRequest | undefined;
  existingDepositIntentAmount: number | null;
  existingReview: AccountReview | null;
  existingRiskProfile: RiskProfile | null;
}) {
  const intendedRange = getMatchedValue(
    intendedDepositRangeValues,
    existingReview?.intendedDepositRange ?? approvedProfile?.capitalRange,
    '$10k-$25k',
  );
  const legalName = `${approvedProfile?.firstName ?? ''} ${approvedProfile?.lastName ?? ''}`.trim();

  return {
    accountType: getMatchedValue<AccountType>(accountTypeValues, existingReview?.accountType, 'Individual'),
    country: existingReview?.country ?? approvedProfile?.country ?? 'United States',
    depositAmount: existingDepositIntentAmount ? String(existingDepositIntentAmount) : getDepositAmountFromRange(intendedRange),
    intendedRange,
    legalName,
    region: existingReview?.region ?? '',
    riskProfile: existingRiskProfile ?? getInitialRiskProfile(approvedProfile?.objective),
    sourceOfFunds: getMatchedValue<SourceOfFunds>(sourceOfFundsValues, existingReview?.sourceOfFunds, 'Employment income'),
  };
}

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
  const unavailable = Array.isArray(params?.setup) ? params?.setup.includes('unavailable') : params?.setup === 'unavailable';
  const welcomeMode = Array.isArray(params?.welcome) ? params?.welcome.includes('1') : params?.welcome === '1';
  const accountId = await getDashboardAccountId();
  const onboarding = await getDashboardOnboardingState(accountId);
  const storedRiskProfile = await getStoredRiskProfile(accountId);
  const approvedProfile = accountId ? await findApprovedAccessRequestByAccountId(accountId) : undefined;
  const reviewValues = getInitialReviewValues({
    approvedProfile,
    existingDepositIntentAmount: onboarding.depositIntentAmount,
    existingReview: onboarding.accountReview,
    existingRiskProfile: storedRiskProfile,
  });
  const setupAlreadyComplete = onboarding.complete;

  if (setupAlreadyComplete && !welcomeMode) {
    redirect('/dashboard');
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-neutral-50">
      <header className="border-b border-neutral-800 bg-[#0a0a0a]/90">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-neutral-50">
            <Mark size={22} />
            Solace
          </Link>
          <Link href="/hermes" className="text-sm font-bold text-neutral-400 transition-colors hover:text-neutral-50">
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
            {setupAlreadyComplete
              ? 'Review the profile from your access request. Setup is already recorded; confirm the details before entering the dashboard.'
              : 'Confirm the profile from your access request, complete the remaining fields, and record capital intent before entering the dashboard.'}
          </p>
          {approvedProfile ? (
            <div className="mt-8 rounded-lg border border-neutral-800 bg-[#0d0d0b] p-4 text-sm">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-neutral-500">Profile on file</p>
              <dl className="mt-4 grid gap-3 text-neutral-300">
                <div>
                  <dt className="text-neutral-500">Name</dt>
                  <dd className="mt-1">{`${approvedProfile.firstName} ${approvedProfile.lastName}`.trim()}</dd>
                </div>
                <div>
                  <dt className="text-neutral-500">Contact</dt>
                  <dd className="mt-1 grid gap-1">
                    <span className="break-all">{approvedProfile.email}</span>
                    {approvedProfile.phone ? <span>{approvedProfile.phone}</span> : null}
                  </dd>
                </div>
                <div>
                  <dt className="text-neutral-500">Profile</dt>
                  <dd className="mt-1">
                    {joinProfileParts([approvedProfile.role, approvedProfile.organization, approvedProfile.country])}
                  </dd>
                </div>
                <div>
                  <dt className="text-neutral-500">Capital</dt>
                  <dd className="mt-1">
                    {joinProfileParts([approvedProfile.capitalRange, approvedProfile.objective])}
                  </dd>
                </div>
              </dl>
            </div>
          ) : null}
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
          className="rounded-lg border border-neutral-800 bg-[#0d0d0b] p-5 shadow-2xl shadow-black/20 sm:p-6"
        >
          <div>
            <p className="text-sm font-medium text-neutral-400">Risk Profile</p>
            <h2 className="mt-1 text-xl font-semibold text-neutral-50">Choose operating posture</h2>
            <RiskProfileSelector initialRiskProfile={reviewValues.riskProfile} />
          </div>

          <div className="mt-8 border-t border-neutral-800 pt-6">
            <p className="text-sm font-medium text-neutral-400">Account Review</p>
            <h2 className="mt-1 text-xl font-semibold text-neutral-50">Light profile</h2>
            <p className="mt-3 text-sm leading-6 text-neutral-400">
              We prefilled what you already submitted. Confirm or correct the details before continuing.
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
                  defaultValue={reviewValues.legalName}
                  className="mt-2 h-11 w-full rounded-md border border-neutral-700 bg-[#0a0a0a] px-3 text-base text-neutral-50 outline-none transition-colors placeholder:text-neutral-600 focus:border-neutral-400"
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
                  defaultValue={reviewValues.accountType}
                  className="mt-2 h-11 w-full rounded-md border border-neutral-700 bg-[#0a0a0a] px-3 text-base text-neutral-50 outline-none transition-colors focus:border-neutral-400"
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
                  defaultValue={reviewValues.country}
                  className="mt-2 h-11 w-full rounded-md border border-neutral-700 bg-[#0a0a0a] px-3 text-base text-neutral-50 outline-none transition-colors placeholder:text-neutral-600 focus:border-neutral-400"
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
                  defaultValue={reviewValues.region}
                  className="mt-2 h-11 w-full rounded-md border border-neutral-700 bg-[#0a0a0a] px-3 text-base text-neutral-50 outline-none transition-colors placeholder:text-neutral-600 focus:border-neutral-400"
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
                  defaultValue={reviewValues.intendedRange}
                  className="mt-2 h-11 w-full rounded-md border border-neutral-700 bg-[#0a0a0a] px-3 text-base text-neutral-50 outline-none transition-colors focus:border-neutral-400"
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
                  defaultValue={reviewValues.sourceOfFunds}
                  className="mt-2 h-11 w-full rounded-md border border-neutral-700 bg-[#0a0a0a] px-3 text-base text-neutral-50 outline-none transition-colors focus:border-neutral-400"
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
              <ConsentCheckbox name="profileConfirmed">
                I have reviewed the profile details above and confirm they are accurate.
              </ConsentCheckbox>
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
            <div className="mt-2 grid grid-cols-[auto_1fr] overflow-hidden rounded-md border border-neutral-700 bg-[#0a0a0a] focus-within:border-neutral-400">
              <span className="grid h-12 place-items-center border-r border-neutral-800 px-4 text-neutral-500">$</span>
              <input
                id="deposit-intent-amount"
                name="depositIntentAmount"
                type="number"
                min="1"
                step="0.01"
                inputMode="decimal"
                required
                defaultValue={reviewValues.depositAmount}
                className="h-12 w-full bg-transparent px-4 text-base text-neutral-50 outline-none placeholder:text-neutral-600"
              />
            </div>

            {invalid || unavailable ? (
              <p className="mt-3 text-sm text-red-300" role="alert">
                {unavailable
                  ? 'For the beta, Preservation and Velocity are unavailable. Balanced is the only live Hermes pool right now.'
                  : 'Select a risk profile and enter a valid amount.'}
              </p>
            ) : null}
          </div>

          <button
            type="submit"
            className="mt-8 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-neutral-50 px-4 text-sm font-semibold text-neutral-950 transition-colors hover:bg-neutral-200"
          >
            {setupAlreadyComplete ? 'Open dashboard' : 'Continue to dashboard'}
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        </form>
      </section>
    </main>
  );
}
