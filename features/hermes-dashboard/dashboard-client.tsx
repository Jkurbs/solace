'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Bug, Check, Clock3, LogOut, Moon, Scale, ShieldCheck, Sun, Zap } from 'lucide-react';
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
  updateRiskProfile,
} from './queries';
import {
  betaLiveRiskProfile,
  betaUnavailableRiskProfileMessage,
  isRiskProfileAvailableForBeta,
  riskProfileDescriptions,
} from './contract';
import type { HermesDashboardSnapshot, IdentityVerificationStatus, RiskProfile } from './types';

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
  'In Strategy': { dark: '#87dbc0', light: '#0f766e' },
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

const liveRefreshIntervalMs = 5_000;

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

function getEquityStateBadgeClass(code: HermesDashboardSnapshot['portfolio']['equityState']['code']) {
  if (code === 'LIVE_EQUITY') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300';
  }

  if (code === 'PENDING_SETTLEMENT' || code === 'TREASURY_QUEUED' || code === 'NAV_PENDING') {
    return 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100';
  }

  return 'border-neutral-200 bg-neutral-100 text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300';
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

function formatAllocationLabel(item: HermesDashboardSnapshot['allocation'][number]) {
  if (!item.side || item.side === 'CASH') {
    return item.asset;
  }

  return `${item.asset} ${item.side === 'SHORT' ? 'Short' : 'Long'}`;
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
  const [identityStatus, setIdentityStatus] = useState('');
  const [logoutStatus, setLogoutStatus] = useState('');
  const [riskStatus, setRiskStatus] = useState('');
  const [theme, setTheme] = useState<DashboardTheme>('dark');
  const queryClient = useQueryClient();
  const { data, isFetching } = useQuery({
    queryKey: hermesDashboardQueryKey,
    queryFn: getHermesDashboardSnapshot,
    initialData: initialSnapshot,
    refetchInterval: liveRefreshIntervalMs,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    staleTime: 0,
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
  const isSimulationMode = data.account.mode === 'SIMULATION';
  const equityState = data.portfolio.equityState;
  const isFundingPending =
    !isAwaitingDeposit &&
    (equityState.code === 'PENDING_SETTLEMENT' ||
      equityState.code === 'TREASURY_QUEUED' ||
      equityState.code === 'NAV_PENDING');
  const deployed = data.status.deployedCapital;
  const cashReserve = data.allocation.find((item) => item.asset.toLowerCase() === 'cash')?.percentage ?? 100 - deployed;
  const portfolioValue = isAwaitingDeposit ? 'Pending' : formatCurrency(data.portfolio.value);
  const todaysChange = isAwaitingDeposit ? '—' : formatTodaysChange(data.portfolio.todaysChange);
  const sinceInception = isAwaitingDeposit ? '—' : formatPercent(data.portfolio.sinceInception, true);
  const availableBalance = data.portfolio.availableBalance ?? data.portfolio.availableToWithdraw;
  const allocatedCapital =
    data.portfolio.allocatedCapital ?? (isAwaitingDeposit ? 0 : (data.portfolio.value * data.status.deployedCapital) / 100);
  const openPnl = data.portfolio.unrealizedPnl ?? 0;
  const activeRiskProfile = isRiskProfileAvailableForBeta(data.status.riskProfile) ? data.status.riskProfile : betaLiveRiskProfile;
  const equityMetrics = [
    {
      label: 'Available Balance',
      value: isAwaitingDeposit ? 'Pending' : formatCurrency(availableBalance),
    },
    {
      label: 'In Strategy',
      value: isAwaitingDeposit ? '—' : formatCurrency(allocatedCapital),
    },
    {
      label: 'Open PnL',
      positive: !isAwaitingDeposit && openPnl > 0,
      value: isAwaitingDeposit ? '—' : formatCurrency(openPnl, { signed: true }),
    },
    {
      label: 'Withdrawable',
      value: isAwaitingDeposit ? 'Pending' : formatCurrency(data.portfolio.withdrawable ?? data.portfolio.availableToWithdraw),
    },
  ];
  const operatingStatus = isAwaitingDeposit ? 'Awaiting deposit' : isFundingPending ? 'Allocation pending' : data.status.status;
  const depositIntentLabel = data.account.depositIntent?.amount
    ? formatCurrency(data.account.depositIntent.amount, { whole: true })
    : 'Pending';
  const accountReviewSubmitted = data.account.review?.status === 'SUBMITTED';
  const setupIncomplete = isAwaitingDeposit && (!accountReviewSubmitted || !data.account.depositIntent?.amount);
  const identityVerificationLabel = formatIdentityStatus(data.account.identityVerification.status);
  const identityHelper =
    identityStatus ||
    (data.account.identityVerification.status === 'SESSION_CREATED'
      ? 'Stripe Identity session has been created. Complete verification in the Stripe flow.'
      : 'Verification uses Stripe Identity when test-mode keys are configured.');
  const activationSteps = [
    {
      detail: activeRiskProfile,
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
      label: 'Withdrawable',
      value: formatCurrency(data.portfolio.withdrawable ?? data.portfolio.availableToWithdraw, { whole: true }),
    },
  ];
  const activationStatusCard = isAwaitingDeposit ? (
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
  ) : null;

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
            <Link
              href="/dashboard/capital"
              className="hidden text-neutral-700 transition-colors hover:text-neutral-950 dark:text-neutral-300 dark:hover:text-neutral-50 sm:inline"
            >
              Capital
            </Link>
            <span className="hidden sm:inline">{data.account.label}</span>
            <Badge variant="secondary" className="hidden sm:inline-flex">
              <span
                className={cn(
                  'mr-1.5 h-1.5 w-1.5 rounded-full',
                  isFetching ? 'bg-amber-300' : 'bg-emerald-300',
                )}
                aria-hidden="true"
              />
              {isFetching ? 'Syncing' : 'Live 5s'}
            </Badge>
            <Badge variant={isSimulationMode ? 'secondary' : 'success'}>{isSimulationMode ? 'Simulation' : 'Live'}</Badge>
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
            <Link
              href="/dashboard/report"
              className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-950 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-50 sm:px-3"
            >
              <Bug size={16} aria-hidden="true" />
              <span className="hidden sm:inline">Report a bug</span>
            </Link>
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
        {activationStatusCard}

        <div>
          <motion.section
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-[#181715] dark:shadow-none sm:p-8"
            aria-labelledby="portfolio-value"
          >
            <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Portfolio Value</p>
                  {!isAwaitingDeposit ? (
                    <Badge className={getEquityStateBadgeClass(equityState.code)} variant="secondary">
                      {equityState.label}
                    </Badge>
                  ) : null}
                  <Badge variant={isSimulationMode ? 'secondary' : 'success'}>
                    {isSimulationMode ? 'Simulation capital' : 'Live capital'}
                  </Badge>
                </div>
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
              <div className="grid gap-4 lg:min-w-[27rem]">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Metric
                    label="Today's Change"
                    value={todaysChange}
                    positive={!isAwaitingDeposit && data.portfolio.todaysChange.amount > 0}
                  />
                  <Metric label="Since Inception" value={sinceInception} positive={!isAwaitingDeposit && data.portfolio.sinceInception > 0} />
                </div>
                <Button asChild className="w-full sm:w-auto sm:justify-self-start" variant={setupIncomplete ? 'secondary' : 'default'}>
                  <Link href={setupIncomplete ? '/dashboard/onboarding' : '/dashboard/capital'}>
                    {setupIncomplete ? 'Complete setup' : 'Move capital'}
                    <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            </div>
            <div className="mt-6 grid gap-4 border-t border-neutral-200 pt-5 dark:border-neutral-800 sm:grid-cols-2 lg:grid-cols-4">
              {equityMetrics.map((item) => (
                <Metric key={item.label} label={item.label} value={item.value} positive={item.positive} />
              ))}
            </div>
          </motion.section>
        </div>

        {isFundingPending ? (
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Funding Status</p>
                  <CardTitle>{equityState.label}</CardTitle>
                </div>
                <Badge variant="secondary">PENDING</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-3">
                <ActivationStep
                  detail={formatCurrency(data.portfolio.deposited, { whole: true })}
                  label={isSimulationMode ? 'Simulation capital received' : 'Capital received'}
                  state="complete"
                />
                <ActivationStep
                  detail={
                    isSimulationMode
                      ? 'Solace treasury routing is being recorded'
                      : equityState.code === 'PENDING_SETTLEMENT'
                        ? 'Awaiting Stripe availability'
                        : 'Solace treasury is preparing allocation'
                  }
                  label={
                    isSimulationMode
                      ? 'Simulation treasury'
                      : equityState.code === 'PENDING_SETTLEMENT'
                        ? 'Settlement tracking'
                        : 'Treasury allocation'
                  }
                  state={equityState.code === 'PENDING_SETTLEMENT' ? 'pending' : equityState.code === 'TREASURY_QUEUED' ? 'pending' : 'complete'}
                />
                <ActivationStep
                  detail={
                    equityState.code === 'NAV_PENDING'
                      ? 'Waiting for NAV mark'
                      : isSimulationMode
                        ? 'Updates after treasury routing completes'
                        : 'Begins after treasury clears'
                  }
                  label={equityState.code === 'NAV_PENDING' ? 'NAV mark' : isSimulationMode ? 'Hermes projection' : 'Hermes deployment'}
                  state="pending"
                />
              </div>
              <p className="mt-5 border-t border-neutral-200 pt-4 text-sm leading-6 text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">
                {equityState.detail}
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
              <Metric label="Risk Profile" value={activeRiskProfile} />
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
                  const available = isRiskProfileAvailableForBeta(profile.label);
                  const selected = activeRiskProfile === profile.label;

                  return (
                    <button
                      key={profile.label}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      aria-disabled={!available || riskProfileMutation.isPending}
                      disabled={available && riskProfileMutation.isPending}
                      onClick={() => {
                        if (!available) {
                          setRiskStatus(betaUnavailableRiskProfileMessage);
                          return;
                        }

                        riskProfileMutation.mutate(profile.label);
                      }}
                      className={cn(
                        'inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition-colors',
                        selected
                          ? 'bg-white text-neutral-950 shadow-sm dark:bg-neutral-700 dark:text-neutral-50'
                          : available
                            ? 'text-neutral-600 hover:bg-white/70 hover:text-neutral-950 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-50'
                            : 'cursor-not-allowed text-neutral-400 opacity-60 dark:text-neutral-600',
                      )}
                    >
                      <Icon size={16} aria-hidden="true" />
                      {profile.label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                {riskProfileDescriptions[activeRiskProfile]}
              </p>
              {riskStatus ? (
                <p
                  className={cn(
                    'mt-2 text-sm leading-6',
                    riskStatus === betaUnavailableRiskProfileMessage
                      ? 'text-amber-600 dark:text-amber-300'
                      : 'text-neutral-500 dark:text-neutral-400',
                  )}
                  role="status"
                >
                  {riskStatus}
                </p>
              ) : (
                <p className="sr-only" aria-live="polite" />
              )}
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
                    <div key={`${item.asset}-${item.side ?? 'allocation'}`} className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: getAllocationColor(item.asset, index, theme) }}
                        aria-hidden="true"
                      />
                      <span className="text-sm text-neutral-600 dark:text-neutral-400">{formatAllocationLabel(item)}</span>
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

        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Live refresh every 5s · Last updated {formatUpdatedAt(equityState.updatedAt ?? data.updatedAt)}
        </p>
      </div>
    </main>
  );
}
