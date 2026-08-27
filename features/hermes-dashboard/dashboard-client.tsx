'use client';

import Link from 'next/link';
import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Check, Clock3, HelpCircle, LogOut, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

import Mark from '@/app/Mark';
import DashboardThemeToggle from '@/app/dashboard/DashboardThemeToggle';
import { ShimmerLink } from '@/components/shimmer-link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { hermesBetaVersionLabel } from '@/features/hermes-version';
import { getAppOrigin } from '@/lib/app-origin';
import { cn } from '@/lib/utils';

import {
  getDashboardChapterMeta,
  getFundingPipelineSteps,
  resolveDashboardChapter,
  type DashboardChapter,
} from './chapters';
import {
  getHermesDashboardSnapshot,
  hermesDashboardQueryKey,
  logoutUser,
  startIdentityVerification,
} from './queries';
import type { DashboardTheme } from './theme';
import { useDashboardTheme } from './use-dashboard-theme';
import type { HermesDashboardSnapshot } from './types';

type HermesDashboardProps = {
  initialSnapshot: HermesDashboardSnapshot;
};

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

const liveRefreshIntervalMs = 5_000;

function getAllocationColor(asset: string, index: number, theme: DashboardTheme) {
  const resolvedTheme: DashboardTheme = theme === 'light' ? 'light' : 'dark';
  const fallbackColors = fallbackAllocationColors[resolvedTheme];

  return allocationColorsByAsset[asset]?.[resolvedTheme] ?? fallbackColors[index % fallbackColors.length];
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

function getEquityStateBadgeClass(code: HermesDashboardSnapshot['portfolio']['equityState']['code']) {
  if (code === 'LIVE_EQUITY') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-[#5f8f6f]/50 dark:bg-[#5f8f6f]/10 dark:text-[#8db89d]';
  }

  if (code === 'PENDING_SETTLEMENT' || code === 'TREASURY_QUEUED' || code === 'NAV_PENDING') {
    return 'border-amber-200 bg-amber-50 text-amber-800 dark:border-[#b8955a]/50 dark:bg-[#b8955a]/10 dark:text-[#d3b585]';
  }

  return 'border-neutral-200 bg-neutral-100 text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300';
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
      <span className="block font-mono text-[0.6rem] uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">
        {label}
      </span>
      <strong
        className={cn(
          'mt-1.5 block text-lg font-semibold tabular-nums text-neutral-950 dark:text-neutral-50',
          positive && 'text-emerald-700 dark:text-[#8db89d]',
        )}
      >
        {value}
      </strong>
    </div>
  );
}

function JourneyStep({
  detail,
  label,
  state,
}: {
  detail: string;
  label: string;
  state: 'complete' | 'current' | 'upcoming' | 'pending';
}) {
  const done = state === 'complete';
  const current = state === 'current';
  const Icon = done ? Check : Clock3;

  return (
    <div
      className={cn(
        'rounded-md border p-4',
        current
          ? 'border-amber-300/50 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10'
          : 'border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/60',
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'grid h-8 w-8 shrink-0 place-items-center rounded-full border',
            done
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
              : current
                ? 'border-amber-300 bg-white text-amber-800 dark:border-amber-500/40 dark:bg-[#0d0d0b] dark:text-amber-200'
                : 'border-neutral-300 bg-white text-neutral-500 dark:border-neutral-700 dark:bg-[#0d0d0b] dark:text-neutral-400',
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

function StoryProgress({
  chapter,
  simulation,
}: {
  chapter: DashboardChapter;
  simulation: boolean;
}) {
  const steps = simulation
    ? [
        { id: 'arrival' as const, label: 'Setup' },
        { id: 'ready' as const, label: 'Capital' },
        { id: 'live' as const, label: 'Hermes' },
      ]
    : [
        { id: 'arrival' as const, label: 'Setup' },
        { id: 'identity' as const, label: 'Identity' },
        { id: 'ready' as const, label: 'Capital' },
        { id: 'live' as const, label: 'Hermes' },
      ];

  const activeIndex = simulation
    ? chapter === 'arrival'
      ? 0
      : chapter === 'ready' || chapter === 'funding' || chapter === 'identity'
        ? 1
        : 2
    : chapter === 'arrival'
      ? 0
      : chapter === 'identity'
        ? 1
        : chapter === 'ready' || chapter === 'funding'
          ? 2
          : 3;

  return (
    <ol className="flex flex-wrap items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400" aria-label="Your path">
      {steps.map((step, index) => {
        const done = index < activeIndex;
        const current = index === activeIndex;

        return (
          <li key={step.id} className="inline-flex items-center gap-2">
            {index > 0 ? <span aria-hidden="true" className="text-neutral-300 dark:text-neutral-700">·</span> : null}
            <span
              className={cn(
                done && 'text-emerald-700 dark:text-emerald-300',
                current && 'font-semibold text-neutral-950 dark:text-neutral-50',
              )}
            >
              {done ? `${step.label} ✓` : step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function HermesDashboard({ initialSnapshot }: HermesDashboardProps) {
  const [capitalNavigationPending, setCapitalNavigationPending] = useState(false);
  const [identityStatus, setIdentityStatus] = useState('');
  const [logoutStatus, setLogoutStatus] = useState('');
  const { theme } = useDashboardTheme();
  const queryClient = useQueryClient();
  const { data, dataUpdatedAt, isError, isFetching } = useQuery({
    queryKey: hermesDashboardQueryKey,
    queryFn: getHermesDashboardSnapshot,
    initialData: initialSnapshot,
    placeholderData: keepPreviousData,
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

  const chapter = resolveDashboardChapter(data);
  const chapterMeta = getDashboardChapterMeta(chapter);
  const isSimulationMode = data.account.mode === 'SIMULATION';
  const equityState = data.portfolio.equityState;
  const depositIntentLabel = data.account.depositIntent?.amount
    ? formatCurrency(data.account.depositIntent.amount, { whole: true })
    : null;
  const identityVerified = data.account.identityVerification.status === 'VERIFIED';
  const identityHelper =
    identityStatus ||
    (data.account.identityVerification.status === 'SESSION_CREATED'
      ? 'Stripe Identity session is open. Finish verification in the Stripe window when you are ready.'
      : '');
  const openPnl = data.portfolio.unrealizedPnl ?? 0;

  const shellClass = cn(
    theme === 'dark' && 'dark',
    'min-h-screen transition-colors',
    theme === 'dark' ? 'bg-[#0a0a0a] text-neutral-50' : 'bg-[#f7f5ef] text-neutral-950',
  );

  const header = (
    <header className="sticky top-0 z-30 border-b border-neutral-200 bg-[#f7f5ef]/90 backdrop-blur dark:border-neutral-800 dark:bg-[#0a0a0a]/90">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <a href={getAppOrigin()} className="solace-wordmark text-neutral-950 dark:text-neutral-50">
          <Mark size={22} />
          Solace
        </a>
        <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400 sm:gap-4">
          <Button asChild size="sm" className="px-3 font-semibold">
            <Link href="/dashboard/waitlist">
              <span className="sm:hidden">Waitlist</span>
              <span className="hidden sm:inline">Join the waitlist</span>
            </Link>
          </Button>
          <Link
            href="/dashboard/capital"
            className="hidden font-bold text-neutral-700 transition-colors hover:text-neutral-950 dark:text-neutral-300 dark:hover:text-neutral-50 sm:inline"
          >
            Capital
          </Link>
          <Badge variant={isSimulationMode ? 'secondary' : 'success'}>
            {isSimulationMode ? 'Simulation' : 'Live'}
          </Badge>
          <span className="sr-only" data-chapter={chapter}>
            {chapterMeta.emotionalJob}
          </span>
          <Link
            href="/dashboard/report"
            className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-sm font-bold text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-950 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-50 sm:px-3"
            title="Something unclear? Tell us."
          >
            <HelpCircle size={16} aria-hidden="true" />
            <span className="hidden sm:inline">Help</span>
          </Link>
          <DashboardThemeToggle />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="px-2 font-bold sm:px-3"
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
  );

  const errorBanner = isError ? (
    <div
      role="alert"
      className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm leading-6 text-amber-700 dark:text-amber-300"
    >
      We could not refresh just now, figures below are from the last successful sync
      {dataUpdatedAt ? ` (${formatUpdatedAt(new Date(dataUpdatedAt).toISOString())})` : ''}. Retrying quietly in the
      background. Nothing is wrong with your account.
    </div>
  ) : null;

  const foot = (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-neutral-500 dark:text-neutral-400">
      <span>{hermesBetaVersionLabel}</span>
      <span aria-hidden="true">·</span>
      <span>{isSimulationMode ? 'Simulation · not an offer' : 'Live capital · not investment advice'}</span>
      <span aria-hidden="true">·</span>
      <span>Updated {formatUpdatedAt(equityState.updatedAt ?? data.updatedAt)}</span>
      {isFetching ? (
        <>
          <span aria-hidden="true">·</span>
          <span>Syncing</span>
        </>
      ) : null}
    </p>
  );

  // ── Chapter: arrival (setup incomplete) ─────────────────────────────────
  if (chapter === 'arrival') {
    return (
      <main className={shellClass}>
        {header}
        <div className="mx-auto grid max-w-2xl gap-6 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          {errorBanner}
          <StoryProgress chapter={chapter} simulation={isSimulationMode} />
          <motion.section
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-[#0d0d0b] sm:p-8"
          >
            <p className="font-mono text-[0.62rem] font-medium uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">
              Hermes · {isSimulationMode ? 'Simulation' : 'Live'}
            </p>
            <h1 className="mt-4 text-3xl font-semibold tracking-normal text-neutral-950 dark:text-neutral-50 sm:text-4xl">
              Welcome. You are in.
            </h1>
            <p className="mt-4 text-base leading-7 text-neutral-600 dark:text-neutral-400">
              {isSimulationMode
                ? 'Your access is approved. Confirm your profile, then add simulation capital. No real money moves.'
                : 'Your access is approved. Next: confirm your profile and capital intent, then complete identity verification. Capital opens only after identity is verified. We prefill what you already shared.'}
            </p>
            <Button asChild size="lg" pending={capitalNavigationPending} className="mt-8 w-full sm:w-auto">
              <Link href="/dashboard/onboarding?welcome=1" onClick={() => setCapitalNavigationPending(true)}>
                {capitalNavigationPending ? 'Opening' : 'Continue setup'}
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </Button>
          </motion.section>
          {foot}
        </div>
      </main>
    );
  }

// ── Chapter: identity (required before capital) ───────────────────────────
  if (chapter === 'identity') {
    return (
      <main className={shellClass}>
        {header}
        <div className="mx-auto grid max-w-2xl gap-6 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          {errorBanner}
          <StoryProgress chapter={chapter} simulation={isSimulationMode} />
          <motion.section
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-[#0d0d0b] sm:p-8"
            aria-labelledby="identity-title"
          >
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-mono text-[0.62rem] font-medium uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">
                Hermes · {isSimulationMode ? 'Simulation' : 'Live'}
              </p>
              <Badge variant="secondary">Required</Badge>
            </div>
            <h1
              id="identity-title"
              className="mt-4 text-3xl font-semibold tracking-normal text-neutral-950 dark:text-neutral-50 sm:text-4xl"
            >
              Verify your identity
            </h1>
            <p className="mt-4 text-base leading-7 text-neutral-600 dark:text-neutral-400">
              Setup is complete. Before capital can move, we need identity verification. This protects you and Solace.
              It is a required step, not a formality you can skip.
            </p>
            <p className="mt-4 text-sm leading-6 text-neutral-500 dark:text-neutral-400">
              Verification runs with Stripe Identity. Sensitive documents stay with Stripe; Solace stores only status.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                type="button"
                size="lg"
                onClick={() => identityVerification.mutate()}
                disabled={identityVerification.isPending || identityVerified}
                pending={identityVerification.isPending}
                className="w-full sm:w-auto"
              >
                <ShieldCheck size={16} aria-hidden="true" />
                {identityVerification.isPending
                  ? 'Opening'
                  : data.account.identityVerification.status === 'SESSION_CREATED'
                    ? 'Continue verification'
                    : data.account.identityVerification.status === 'REQUIRES_INPUT'
                      ? 'Resume verification'
                      : 'Start identity verification'}
              </Button>
            </div>
            {identityHelper ? (
              <p className="mt-4 text-sm leading-6 text-neutral-500 dark:text-neutral-400" aria-live="polite">
                {identityHelper}
              </p>
            ) : null}
            {depositIntentLabel ? (
              <p className="mt-6 rounded-md border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm leading-6 text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900/60 dark:text-neutral-300">
                After verification, you can add capital
                {depositIntentLabel ? (
                  <>
                    {' '}
                    (intent on file: <strong className="text-neutral-950 dark:text-neutral-50">{depositIntentLabel}</strong>)
                  </>
                ) : null}
                .
              </p>
            ) : null}
          </motion.section>
          {foot}
        </div>
      </main>
    );
  }

  // ── Chapter: ready (profile + identity done, unfunded) ──────────────────
  if (chapter === 'ready') {
    return (
      <main className={shellClass}>
        {header}
        <div className="mx-auto grid max-w-2xl gap-6 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          {errorBanner}
          <StoryProgress chapter={chapter} simulation={isSimulationMode} />
          <motion.section
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-[#0d0d0b] sm:p-8"
            aria-labelledby="ready-title"
          >
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-mono text-[0.62rem] font-medium uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">
                Hermes · {isSimulationMode ? 'Simulation' : 'Live'}
              </p>
              {identityVerified && !isSimulationMode ? <Badge variant="secondary">Identity verified</Badge> : null}
            </div>
            <h1
              id="ready-title"
              className="mt-4 text-3xl font-semibold tracking-normal text-neutral-950 dark:text-neutral-50 sm:text-4xl"
            >
              You are ready. Nothing is wrong.
            </h1>
            <p className="mt-4 text-base leading-7 text-neutral-600 dark:text-neutral-400">
              {isSimulationMode
                ? 'Setup is complete. Hermes has no capital to work with yet, so it stays still. That is expected. When you are ready, add simulation capital and allocation can begin.'
                : 'Setup and identity are complete. Hermes has no capital to work with yet, so it stays still. That is expected. When you are ready, add capital and allocation can begin.'}
            </p>
            {depositIntentLabel ? (
              <p className="mt-4 rounded-md border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm leading-6 text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900/60 dark:text-neutral-300">
                Intent on file: <strong className="text-neutral-950 dark:text-neutral-50">{depositIntentLabel}</strong>
                . You can change the amount on the next screen.
              </p>
            ) : null}
            <div className="mt-8">
              <Button asChild size="lg" pending={capitalNavigationPending} className="w-full sm:w-auto">
                <Link href="/dashboard/capital" onClick={() => setCapitalNavigationPending(true)}>
                  {capitalNavigationPending
                    ? 'Opening'
                    : isSimulationMode
                      ? 'Add simulation capital'
                      : 'Add capital'}
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </Button>
            </div>
            <p className="mt-4 text-sm leading-6 text-neutral-500 dark:text-neutral-400">
              {isSimulationMode
                ? 'Simulation uses sandbox rails when configured. No real money moves.'
                : 'Deposits use your approved Solace account rails.'}
            </p>
          </motion.section>
          {foot}
        </div>
      </main>
    );
  }

  // ── Chapter: funding (money in flight) ──────────────────────────────────
  if (chapter === 'funding') {
    const pipeline = getFundingPipelineSteps(equityState.code);

    return (
      <main className={shellClass}>
        {header}
        <div className="mx-auto grid max-w-3xl gap-6 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          {errorBanner}
          <StoryProgress chapter={chapter} simulation={isSimulationMode} />
          <motion.section
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-[#0d0d0b] sm:p-8"
          >
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-mono text-[0.62rem] font-medium uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">
                Capital in flight
              </p>
              <Badge className={getEquityStateBadgeClass(equityState.code)} variant="secondary">
                {equityState.label}
              </Badge>
              <Badge variant={isSimulationMode ? 'secondary' : 'success'}>
                {isSimulationMode ? 'Simulation' : 'Live'}
              </Badge>
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-normal text-neutral-950 dark:text-neutral-50 sm:text-4xl">
              You did not break anything.
            </h1>
            <p className="mt-4 text-base leading-7 text-neutral-600 dark:text-neutral-400">
              Capital is received and moving through Solace before Hermes shows it on your balance. Safe to leave this
              tab, the update will be here when you return.
            </p>
            <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">
              Posted:{' '}
              <strong className="text-neutral-800 dark:text-neutral-200">
                {formatCurrency(data.portfolio.deposited, { whole: true })}
              </strong>
            </p>
          </motion.section>

          <div className="grid gap-3">
            {pipeline.map((step) => (
              <JourneyStep key={step.label} detail={step.detail} label={step.label} state={step.state} />
            ))}
          </div>

          <p className="text-sm leading-6 text-neutral-500 dark:text-neutral-400">{equityState.detail}</p>

          <Button asChild variant="secondary" className="w-full sm:w-auto sm:justify-self-start">
            <ShimmerLink href="/dashboard/capital">View capital</ShimmerLink>
          </Button>
          {foot}
        </div>
      </main>
    );
  }

  // ── Chapters: live + standing_down (funded) ─────────────────────────────
  const waitingForNextPath =
    data.status.deployedCapital <= 0 ||
    data.allocation.every((item) => item.asset === 'Cash' || item.percentage <= 0);

  return (
    <main className={shellClass}>
      {header}
      <div className="mx-auto grid max-w-3xl gap-5 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {errorBanner}

        <motion.section
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-[#0d0d0b] dark:shadow-none sm:p-8"
          aria-labelledby="portfolio-value"
        >
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-mono text-[0.62rem] font-medium uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">
              Portfolio value
            </p>
            <Badge className={getEquityStateBadgeClass(equityState.code)} variant="secondary">
              {equityState.label}
            </Badge>
            <Badge variant={isSimulationMode ? 'secondary' : 'success'}>
              {isSimulationMode ? 'Simulation' : 'Live'}
            </Badge>
          </div>
          <h1
            id="portfolio-value"
            className="mt-3 text-5xl font-medium leading-none tracking-[-0.01em] tabular-nums text-neutral-950 [font-family:var(--font-display),Georgia,serif] dark:text-neutral-50 sm:text-6xl"
          >
            {formatCurrency(data.portfolio.value)}
          </h1>
          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <Metric
              label="Open PnL"
              value={formatCurrency(openPnl, { signed: true })}
              positive={openPnl > 0}
            />
            <Button asChild pending={capitalNavigationPending} className="w-full sm:w-auto">
              <Link href="/dashboard/capital" onClick={() => setCapitalNavigationPending(true)}>
                {capitalNavigationPending ? 'Opening' : 'Move capital'}
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </motion.section>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle>Current allocation</CardTitle>
          </CardHeader>
          <CardContent>
            {data.allocation.length === 0 ? (
              <p className="text-sm leading-6 text-neutral-500 dark:text-neutral-400">
                Cash sits until Hermes opens a path.
              </p>
            ) : (
              <div className="grid gap-3">
                {data.allocation.map((item, index) => (
                  <div
                    key={`${item.asset}-${item.side ?? 'allocation'}`}
                    className="grid grid-cols-[auto_1fr_auto] items-center gap-3"
                  >
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
            )}
            {waitingForNextPath ? (
              <p className="mt-4 text-sm leading-6 text-neutral-500 dark:text-neutral-400" role="status">
                Hermes will open the next path when conditions clear. That is expected. Capital stays yours.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle>Recent decisions</CardTitle>
          </CardHeader>
          <CardContent>
            {data.activity.length === 0 ? (
              <p className="text-sm leading-6 text-neutral-500 dark:text-neutral-400">
                No closes on your book yet. Hermes will open a path when conditions clear.
              </p>
            ) : null}
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

        <section
          className="flex flex-col gap-4 rounded-lg border border-neutral-950 bg-neutral-950 px-5 py-5 text-white sm:flex-row sm:items-center sm:justify-between dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-950 sm:px-6"
          aria-label="Capital waitlist"
        >
          <div className="max-w-xl">
            <p className="text-base font-semibold tracking-tight">Join the waitlist</p>
            <p className="mt-1 text-sm leading-6 text-white/75 dark:text-neutral-700">
              Hermes is founder capital only. You cannot invest yet. Ask to be considered when a place opens.
            </p>
          </div>
          <Button
            asChild
            size="lg"
            className="w-full shrink-0 bg-white text-neutral-950 hover:bg-neutral-100 dark:bg-neutral-950 dark:text-white dark:hover:bg-neutral-800 sm:w-auto"
          >
            <Link href="/dashboard/waitlist">
              Join the waitlist
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </Button>
        </section>

        {foot}
      </div>
    </main>
  );
}
