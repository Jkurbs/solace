'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDownToLine, ArrowRight, ArrowUpFromLine, Check, Clock3, LogOut, Moon, Scale, ShieldCheck, Sun, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

import Mark from '@/app/Mark';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import {
  getHermesDashboardSnapshot,
  hermesDashboardQueryKey,
  logoutUser,
  startIdentityVerification,
  startMoneyMovement,
  updateRiskProfile,
} from './queries';
import { riskProfileDescriptions } from './contract';
import type { HermesDashboardSnapshot, IdentityVerificationStatus, MoneyMovementType, RiskProfile } from './types';

type HermesDashboardProps = {
  initialSnapshot: HermesDashboardSnapshot;
};

type DashboardTheme = 'dark' | 'light';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  currency: 'USD',
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  style: 'currency',
});

const wholeCurrencyFormatter = new Intl.NumberFormat('en-US', {
  currency: 'USD',
  maximumFractionDigits: 0,
  style: 'currency',
});

const numberFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 2,
});

const activityDatePartsFormatter = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'short',
  timeZone: 'America/New_York',
});

const updatedAtPartsFormatter = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  hour: 'numeric',
  hour12: true,
  minute: '2-digit',
  month: 'short',
  timeZone: 'America/New_York',
  timeZoneName: 'short',
  year: 'numeric',
});

const allocationColorsByAsset: Record<string, Record<DashboardTheme, string>> = {
  BTC: { dark: '#f2eadb', light: '#151515' },
  Cash: { dark: '#697067', light: '#d9ded7' },
  Other: { dark: '#d8a85b', light: '#c89245' },
  SUI: { dark: '#6ea8ff', light: '#2f72d6' },
};

const fallbackAllocationColors: Record<DashboardTheme, string[]> = {
  dark: ['#f2eadb', '#6ea8ff', '#697067', '#d8a85b', '#87dbc0'],
  light: ['#151515', '#2f72d6', '#d9ded7', '#c89245', '#87dbc0'],
};

const riskProfiles: Array<{ label: RiskProfile; icon: typeof ShieldCheck }> = [
  { label: 'Preservation', icon: ShieldCheck },
  { label: 'Balanced', icon: Scale },
  { label: 'Velocity', icon: Zap },
];

function getAllocationColor(asset: string, index: number, theme: DashboardTheme) {
  const resolvedTheme: DashboardTheme = theme === 'light' ? 'light' : 'dark';
  const fallbackColors = fallbackAllocationColors[resolvedTheme];

  return allocationColorsByAsset[asset]?.[resolvedTheme] ?? fallbackColors[index % fallbackColors.length];
}

function buildAllocationGradient(allocation: HermesDashboardSnapshot['allocation'], theme: DashboardTheme) {
  let cursor = 0;
  const stops = allocation.map((item, index) => {
    const start = cursor;
    cursor += item.percentage;
    return `${getAllocationColor(item.asset, index, theme)} ${start}% ${cursor}%`;
  });

  return `conic-gradient(${stops.join(', ')})`;
}

function formatCurrency(value: number, options: { signed?: boolean; whole?: boolean } = {}) {
  const sign = options.signed && value > 0 ? '+' : value < 0 ? '-' : '';
  const formatter = options.whole ? wholeCurrencyFormatter : currencyFormatter;

  return `${sign}${formatter.format(Math.abs(value))}`;
}

function formatPercent(value: number, signed = false) {
  const sign = signed && value > 0 ? '+' : value < 0 ? '-' : '';

  return `${sign}${numberFormatter.format(Math.abs(value))}%`;
}

function formatTodaysChange(change: HermesDashboardSnapshot['portfolio']['todaysChange']) {
  return `${formatCurrency(change.amount, { signed: true })} (${formatPercent(change.percentage, true)})`;
}

function formatConstantLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function formatIdentityStatus(value: IdentityVerificationStatus) {
  return value
    .toLowerCase()
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function coerceDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

function getDatePart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) {
  return parts.find((part) => part.type === type)?.value ?? '';
}

function formatActivityDate(value: Date | string) {
  const parts = activityDatePartsFormatter.formatToParts(coerceDate(value));

  return `${getDatePart(parts, 'month')} ${getDatePart(parts, 'day')}`;
}

function formatUpdatedAt(value: Date | string) {
  const parts = updatedAtPartsFormatter.formatToParts(coerceDate(value));

  return [
    `${getDatePart(parts, 'month')} ${getDatePart(parts, 'day')}, ${getDatePart(parts, 'year')}`,
    `${getDatePart(parts, 'hour')}:${getDatePart(parts, 'minute')} ${getDatePart(parts, 'dayPeriod')}`,
    getDatePart(parts, 'timeZoneName'),
  ].join(' ');
}

function Metric({ label, value, positive = false }: { label: string; value: string; positive?: boolean }) {
  return (
    <div>
      <span className="block text-sm text-neutral-500 dark:text-neutral-400">{label}</span>
      <strong
        className={cn(
          'mt-1 block text-lg font-semibold text-neutral-950 dark:text-neutral-50',
          positive && 'text-emerald-700 dark:text-emerald-300',
        )}
      >
        {value}
      </strong>
    </div>
  );
}

function ActivationStep({
  detail,
  label,
  state,
}: {
  detail: string;
  label: string;
  state: 'complete' | 'pending';
}) {
  const Icon = state === 'complete' ? Check : Clock3;

  return (
    <div className="rounded-md border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/60">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'grid h-8 w-8 shrink-0 place-items-center rounded-full border',
            state === 'complete'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
              : 'border-neutral-300 bg-white text-neutral-500 dark:border-neutral-700 dark:bg-[#181715] dark:text-neutral-400',
          )}
        >
          <Icon size={16} aria-hidden="true" />
        </span>
        <div>
          <strong className="block text-sm font-semibold text-neutral-950 dark:text-neutral-50">{label}</strong>
          <span className="mt-1 block text-sm leading-5 text-neutral-500 dark:text-neutral-400">{detail}</span>
        </div>
      </div>
    </div>
  );
}

export function HermesDashboard({ initialSnapshot }: HermesDashboardProps) {
  const [actionStatus, setActionStatus] = useState('');
  const [identityStatus, setIdentityStatus] = useState('');
  const [logoutStatus, setLogoutStatus] = useState('');
  const [riskStatus, setRiskStatus] = useState('');
  const [theme, setTheme] = useState<DashboardTheme>('dark');
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: hermesDashboardQueryKey,
    queryFn: getHermesDashboardSnapshot,
    initialData: initialSnapshot,
    staleTime: 30_000,
  });

  const moneyMovement = useMutation({
    mutationFn: (type: MoneyMovementType) => startMoneyMovement(type),
    onMutate() {
      setActionStatus('');
    },
    onError(error) {
      setActionStatus(error.message);
    },
    onSuccess(payload) {
      setActionStatus(payload.message ?? '');
    },
  });

  const identityVerification = useMutation({
    mutationFn: startIdentityVerification,
    onMutate() {
      setIdentityStatus('');
    },
    onError(error) {
      setIdentityStatus(error.message);
    },
    onSuccess(payload) {
      setIdentityStatus(payload.message ?? '');
      queryClient.invalidateQueries({ queryKey: hermesDashboardQueryKey });
    },
  });

  const logout = useMutation({
    mutationFn: logoutUser,
    onMutate() {
      setLogoutStatus('');
    },
    onError(error) {
      setLogoutStatus(error.message);
    },
  });

  const riskProfileMutation = useMutation({
    mutationFn: (riskProfile: RiskProfile) => updateRiskProfile(riskProfile),
    onMutate(riskProfile) {
      setRiskStatus('');
      const previous = queryClient.getQueryData<HermesDashboardSnapshot>(hermesDashboardQueryKey);

      queryClient.setQueryData<HermesDashboardSnapshot>(hermesDashboardQueryKey, (current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          status: {
            ...current.status,
            riskProfile,
          },
        };
      });

      return { previous };
    },
    onError(error, _riskProfile, context) {
      if (context?.previous) {
        queryClient.setQueryData(hermesDashboardQueryKey, context.previous);
      }
      setRiskStatus(error.message);
    },
    onSuccess(riskProfile) {
      queryClient.setQueryData<HermesDashboardSnapshot>(hermesDashboardQueryKey, (current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          status: {
            ...current.status,
            riskProfile,
          },
        };
      });
      setRiskStatus(`${riskProfile} profile selected`);
    },
  });

  useEffect(() => {
    const storedTheme = window.localStorage.getItem('hermes_dashboard_theme');

    if (storedTheme === 'dark' || storedTheme === 'light') {
      setTheme(storedTheme);
    }
  }, []);

  function toggleTheme() {
    setTheme((current) => {
      const next = current === 'dark' ? 'light' : 'dark';
      window.localStorage.setItem('hermes_dashboard_theme', next);
      return next;
    });
  }

  const allocationGradient = useMemo(() => buildAllocationGradient(data.allocation, theme), [data.allocation, theme]);
  const isAwaitingDeposit = data.account.lifecycle === 'AWAITING_DEPOSIT';
  const deployed = data.status.deployedCapital;
  const cashReserve = data.allocation.find((item) => item.asset.toLowerCase() === 'cash')?.percentage ?? 100 - deployed;
  const portfolioValue = isAwaitingDeposit ? 'Pending' : formatCurrency(data.portfolio.value);
  const todaysChange = isAwaitingDeposit ? '—' : formatTodaysChange(data.portfolio.todaysChange);
  const sinceInception = isAwaitingDeposit ? '—' : formatPercent(data.portfolio.sinceInception, true);
  const operatingStatus = isAwaitingDeposit ? 'Awaiting deposit' : data.status.status;
  const depositIntentLabel = data.account.depositIntent?.amount
    ? formatCurrency(data.account.depositIntent.amount, { whole: true })
    : 'Pending';
  const accountReviewSubmitted = data.account.review?.status === 'SUBMITTED';
  const setupIncomplete = isAwaitingDeposit && (!accountReviewSubmitted || !data.account.depositIntent?.amount);
  const actionHelper =
    actionStatus ||
    (setupIncomplete
      ? 'You can review Hermes now. Complete setup before deposits open.'
      : isAwaitingDeposit
        ? 'Deposits are reviewed before Hermes begins allocation.'
        : 'Capital movement runs through the approved account rails.');
  const identityVerificationLabel = formatIdentityStatus(data.account.identityVerification.status);
  const identityHelper =
    identityStatus ||
    (data.account.identityVerification.status === 'SESSION_CREATED'
      ? 'Stripe Identity session has been created. Complete verification in the Stripe flow.'
      : 'Verification uses Stripe Identity when test-mode keys are configured.');
  const activationSteps = [
    {
      detail: data.status.riskProfile,
      label: 'Risk profile selected',
      state: 'complete',
    },
    {
      detail: accountReviewSubmitted ? `${data.account.review?.accountType} · ${data.account.review?.country}` : 'Pending',
      label: 'Account review submitted',
      state: accountReviewSubmitted ? 'complete' : 'pending',
    },
    {
      detail: identityVerificationLabel,
      label: 'Identity verification',
      state: data.account.identityVerification.status === 'VERIFIED' ? 'complete' : 'pending',
    },
    {
      detail: depositIntentLabel,
      label: 'Capital intent recorded',
      state: data.account.depositIntent?.amount ? 'complete' : 'pending',
    },
    {
      detail: 'Next step from Solace',
      label: 'Funding instructions pending',
      state: 'pending',
    },
    {
      detail: 'Begins after funding',
      label: 'Hermes activation pending',
      state: 'pending',
    },
  ] satisfies Array<{ detail: string; label: string; state: 'complete' | 'pending' }>;
  const accountMetrics = [
    { label: 'Total Deposited', value: formatCurrency(data.portfolio.deposited, { whole: true }) },
    {
      label: 'Current Value',
      value: isAwaitingDeposit ? 'Pending' : formatCurrency(data.portfolio.value, { whole: true }),
    },
    {
      label: 'Net Profit',
      positive: !isAwaitingDeposit && data.portfolio.profit > 0,
      value: isAwaitingDeposit ? '—' : formatCurrency(data.portfolio.profit, { signed: true, whole: true }),
    },
    {
      label: 'Available To Withdraw',
      value: formatCurrency(data.portfolio.availableToWithdraw, { whole: true }),
    },
  ];

  return (
    <main
      className={cn(
        theme === 'dark' && 'dark',
        'min-h-screen transition-colors',
        theme === 'dark' ? 'bg-[#10100e] text-neutral-50' : 'bg-[#f7f5ef] text-neutral-950',
      )}
    >
      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-[#f7f5ef]/90 backdrop-blur dark:border-neutral-800 dark:bg-[#10100e]/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-950 dark:text-neutral-50">
            <Mark size={22} />
            Solace
          </Link>
          <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400 sm:gap-4">
            <Link
              href="/hermes"
              className="hidden text-neutral-700 transition-colors hover:text-neutral-950 dark:text-neutral-300 dark:hover:text-neutral-50 sm:inline"
            >
              Hermes
            </Link>
            <Link
              href="/dashboard/contract"
              className="hidden text-neutral-700 transition-colors hover:text-neutral-950 dark:text-neutral-300 dark:hover:text-neutral-50 sm:inline"
            >
              Contract
            </Link>
            <span className="hidden sm:inline">{data.account.label}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="px-2 sm:px-3"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              aria-pressed={theme === 'dark'}
            >
              {theme === 'dark' ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
              <span className="hidden sm:inline">{theme === 'dark' ? 'Light' : 'Dark'}</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="px-2 sm:px-3"
              disabled={logout.isPending}
              onClick={() => logout.mutate()}
              aria-label="Logout"
            >
              <LogOut size={16} aria-hidden="true" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
            <p className="sr-only" aria-live="polite">
              {logoutStatus}
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-5 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
          <motion.section
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-[#181715] dark:shadow-none sm:p-8"
            aria-labelledby="portfolio-value"
          >
            <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
              <div>
                <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Portfolio Value</p>
                <h1
                  id="portfolio-value"
                  className={cn(
                    'mt-3 font-semibold leading-none text-neutral-950 dark:text-neutral-50',
                    isAwaitingDeposit ? 'text-4xl sm:text-5xl' : 'text-5xl sm:text-6xl',
                  )}
                >
                  {portfolioValue}
                </h1>
                {isAwaitingDeposit && data.account.depositIntent?.amount ? (
                  <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">
                    Initial capital intent: {formatCurrency(data.account.depositIntent.amount, { whole: true })}
                  </p>
                ) : null}
              </div>
              <div className="grid gap-4 sm:grid-cols-2 md:min-w-[22rem]">
                <Metric
                  label="Today's Change"
                  value={todaysChange}
                  positive={!isAwaitingDeposit && data.portfolio.todaysChange.amount > 0}
                />
                <Metric label="Since Inception" value={sinceInception} positive={!isAwaitingDeposit && data.portfolio.sinceInception > 0} />
              </div>
            </div>
          </motion.section>

          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Actions</p>
                  <CardTitle>{isAwaitingDeposit ? 'Complete setup' : 'Move capital'}</CardTitle>
                </div>
                <Badge variant={data.status.status === 'ACTIVE' ? 'success' : 'secondary'}>
                  {isAwaitingDeposit ? 'PENDING' : data.status.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  onClick={() => moneyMovement.mutate('deposit')}
                  disabled={moneyMovement.isPending}
                >
                  <ArrowDownToLine size={16} aria-hidden="true" />
                  Deposit
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => moneyMovement.mutate('withdraw')}
                  disabled={moneyMovement.isPending || isAwaitingDeposit}
                >
                  <ArrowUpFromLine size={16} aria-hidden="true" />
                  Withdraw
                </Button>
              </div>
              <p className="mt-3 text-sm leading-6 text-neutral-500 dark:text-neutral-400" aria-live="polite">
                {actionHelper}
              </p>
            </CardContent>
          </Card>
        </div>

        {isAwaitingDeposit ? (
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Activation Status</p>
                  <CardTitle>Pending activation</CardTitle>
                </div>
                <Badge variant="secondary">IN REVIEW</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {activationSteps.map((step) => (
                  <ActivationStep key={step.label} detail={step.detail} label={step.label} state={step.state} />
                ))}
              </div>
              <div className="mt-5 grid gap-4 border-t border-neutral-200 pt-4 dark:border-neutral-800 md:grid-cols-[1fr_auto] md:items-center">
                <p className="text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                  Hermes will begin allocation after identity verification, capital receipt, and account activation.
                </p>
                <div className="grid gap-3 sm:grid-cols-2 md:flex md:justify-end">
                  {setupIncomplete ? (
                    <Button asChild variant="secondary" className="w-full md:w-auto">
                      <Link href="/dashboard/onboarding">
                        <ArrowRight size={16} aria-hidden="true" />
                        Complete setup
                      </Link>
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => identityVerification.mutate()}
                    disabled={identityVerification.isPending || data.account.identityVerification.status === 'VERIFIED'}
                    className="w-full md:w-auto"
                  >
                    <ShieldCheck size={16} aria-hidden="true" />
                    {identityVerification.isPending ? 'Opening' : 'Start verification'}
                  </Button>
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-neutral-500 dark:text-neutral-400" aria-live="polite">
                {identityHelper}
              </p>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader className="pb-4">
            <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Hermes Status</p>
            <CardTitle>Operating posture</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Metric label="Status" value={operatingStatus} positive={data.status.status === 'ACTIVE'} />
              <Metric label="Risk Profile" value={data.status.riskProfile} />
              <Metric label="Capital Deployed" value={formatPercent(data.status.deployedCapital)} />
              <Metric label="Conviction" value={formatConstantLabel(data.status.conviction)} />
            </div>
            <div className="mt-6 border-t border-neutral-200 pt-5 dark:border-neutral-800">
              <span className="block text-sm text-neutral-500 dark:text-neutral-400">Update Risk Profile</span>
              <div
                className="mt-3 grid gap-2 rounded-lg bg-neutral-100 p-1 dark:bg-neutral-900 sm:grid-cols-3"
                role="radiogroup"
                aria-label="Risk profile"
              >
                {riskProfiles.map((profile) => {
                  const Icon = profile.icon;
                  const selected = data.status.riskProfile === profile.label;

                  return (
                    <button
                      key={profile.label}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={riskProfileMutation.isPending}
                      onClick={() => riskProfileMutation.mutate(profile.label)}
                      className={cn(
                        'inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition-colors',
                        selected
                          ? 'bg-white text-neutral-950 shadow-sm dark:bg-neutral-700 dark:text-neutral-50'
                          : 'text-neutral-600 hover:bg-white/70 hover:text-neutral-950 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-50',
                      )}
                    >
                      <Icon size={16} aria-hidden="true" />
                      {profile.label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                {riskProfileDescriptions[data.status.riskProfile]}
              </p>
              <p className="sr-only" aria-live="polite">
                {riskStatus}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Hermes Outlook</p>
            <CardTitle>Opportunity environment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-5 md:grid-cols-[14rem_1fr] md:items-center">
              <div>
                <span className="block text-sm text-neutral-500 dark:text-neutral-400">Current Outlook</span>
                <strong className="mt-2 block text-4xl font-semibold text-neutral-950 dark:text-neutral-50">
                  {data.outlook.environment}
                </strong>
              </div>
              <div className="border-t border-neutral-200 pt-5 dark:border-neutral-800 md:border-l md:border-t-0 md:pl-6 md:pt-0">
                <span className="block text-sm font-medium text-neutral-950 dark:text-neutral-50">{data.outlook.stance}</span>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                  {data.outlook.note}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader className="pb-4">
              <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Current Allocation</p>
              <CardTitle>Capital mix</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-md border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/70">
                  <span className="block text-sm text-neutral-500 dark:text-neutral-400">Capital Deployed</span>
                  <strong className="mt-1 block text-2xl font-semibold text-neutral-950 dark:text-neutral-50">
                    {formatPercent(deployed)}
                  </strong>
                </div>
                <div className="rounded-md border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/70">
                  <span className="block text-sm text-neutral-500 dark:text-neutral-400">Cash Reserve</span>
                  <strong className="mt-1 block text-2xl font-semibold text-neutral-950 dark:text-neutral-50">
                    {formatPercent(cashReserve)}
                  </strong>
                </div>
              </div>
              <div className="grid gap-7 sm:grid-cols-[13rem_1fr] sm:items-center">
                <div
                  className="grid aspect-square place-items-center rounded-full"
                  style={{ background: allocationGradient }}
                  aria-hidden="true"
                >
                  <div className="grid h-[64%] w-[64%] place-items-center rounded-full bg-white text-center shadow-inner dark:bg-[#181715]">
                    <div>
                      <span className="block text-sm text-neutral-500 dark:text-neutral-400">Allocated</span>
                      <strong className="mt-1 block text-2xl font-semibold text-neutral-950 dark:text-neutral-50">
                        {formatPercent(deployed)}
                      </strong>
                    </div>
                  </div>
                </div>
                <div className="grid gap-3">
                  {data.allocation.map((item, index) => (
                    <div key={item.asset} className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: getAllocationColor(item.asset, index, theme) }}
                        aria-hidden="true"
                      />
                      <span className="text-sm text-neutral-600 dark:text-neutral-400">{item.asset}</span>
                      <strong className="text-sm font-semibold text-neutral-950 dark:text-neutral-50">
                        {formatPercent(item.percentage)}
                      </strong>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Recent Activity</p>
              <CardTitle>Latest decisions</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="grid gap-0">
                {data.activity.map((item) => {
                  const timestamp = coerceDate(item.timestamp);

                  return (
                    <li
                      key={`${timestamp.toISOString()}-${item.summary}`}
                      className="grid grid-cols-[4.5rem_1fr] gap-4 border-t border-neutral-200 py-4 first:border-t-0 first:pt-0 last:pb-0 dark:border-neutral-800"
                    >
                      <time className="text-sm text-neutral-500 dark:text-neutral-400" dateTime={timestamp.toISOString()}>
                        {formatActivityDate(timestamp)}
                      </time>
                      <span className="text-sm font-medium text-neutral-950 dark:text-neutral-50">{item.summary}</span>
                    </li>
                  );
                })}
              </ol>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Hermes Commentary</p>
            <CardTitle>Current read</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="max-w-3xl text-lg leading-8 text-neutral-800 dark:text-neutral-200">{data.commentary}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Account</p>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {accountMetrics.map((item) => (
                <Metric key={item.label} label={item.label} value={item.value} positive={item.positive} />
              ))}
            </div>
          </CardContent>
        </Card>

        <p className="text-sm text-neutral-500 dark:text-neutral-400">Last updated {formatUpdatedAt(data.updatedAt)}</p>
      </div>
    </main>
  );
}
