'use client';

import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import type { LiveLedgerOverview } from '@/features/ledger/live-overview';
import type { MoneyMovementRecords, PoolMarkingPool, PoolMarkingRecords } from '@/features/ledger/types';

type ConsoleLivePayload = {
  generatedAt: string;
  ledgerOverview: LiveLedgerOverview;
  moneyMovement: MoneyMovementRecords;
  poolMarking: PoolMarkingRecords;
};

type ConsoleLivePanelsProps = {
  initialData: ConsoleLivePayload;
};

const consoleLiveQueryKey = ['console-live'] as const;
const refreshIntervalMs = 5_000;
const activeTreasuryStatuses = ['WAITING_SETTLEMENT', 'QUEUED', 'REVIEWING', 'FUNDABLE', 'APPROVED', 'SUBMITTED'];

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  hour: 'numeric',
  hour12: true,
  minute: '2-digit',
  month: 'short',
  timeZone: 'America/New_York',
  timeZoneName: 'short',
  year: 'numeric',
});

const timeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  hour12: true,
  minute: '2-digit',
  second: '2-digit',
});

const currencyFormatter = new Intl.NumberFormat('en-US', {
  currency: 'USD',
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  style: 'currency',
});

const navFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 6,
  minimumFractionDigits: 4,
});

const unitsFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 4,
});

function formatDate(value: string) {
  return dateFormatter.format(new Date(value));
}

function formatTime(value: string) {
  return timeFormatter.format(new Date(value));
}

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

function formatNav(value: number) {
  return navFormatter.format(value);
}

function formatUnits(value: number) {
  return unitsFormatter.format(value);
}

function formatConstant(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function shortenId(value: string | undefined) {
  if (!value) {
    return 'None';
  }

  if (value.length <= 18) {
    return value;
  }

  return `${value.slice(0, 12)}...${value.slice(-4)}`;
}

function getMoneyStatusClass(status: string) {
  if (['posted', 'available', 'ACTIVE', 'APPROVED', 'COMPLETED', 'FUNDABLE', 'reconciled'].includes(status)) {
    return 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200';
  }

  if (['open', 'pending', 'QUEUED', 'REVIEWING', 'SUBMITTED', 'WAITING_SETTLEMENT', 'PENDING_ACTIVATION'].includes(status)) {
    return 'border-amber-300/25 bg-amber-300/10 text-amber-100';
  }

  if (['failed', 'unavailable', 'FAILED', 'CANCELED', 'expired', 'SUSPENDED', 'REVOKED'].includes(status)) {
    return 'border-red-400/30 bg-red-400/10 text-red-200';
  }

  return 'border-neutral-700 bg-neutral-950/40 text-neutral-300';
}

function getToneRank(tone: 'green' | 'amber' | 'red') {
  return tone === 'red' ? 3 : tone === 'amber' ? 2 : 1;
}

function getHealthPanelClass(tone: 'green' | 'amber' | 'red') {
  if (tone === 'red') {
    return 'border-red-400/40 bg-red-400/10';
  }

  if (tone === 'amber') {
    return 'border-amber-300/35 bg-amber-300/10';
  }

  return 'border-emerald-400/30 bg-emerald-400/10';
}

function getHealthTextClass(tone: 'green' | 'amber' | 'red') {
  if (tone === 'red') {
    return 'text-red-100';
  }

  if (tone === 'amber') {
    return 'text-amber-100';
  }

  return 'text-emerald-100';
}

async function getConsoleLivePayload(): Promise<ConsoleLivePayload> {
  const response = await fetch('/api/console/live', {
    headers: {
      Accept: 'application/json',
    },
  });
  const payload = (await response.json()) as ConsoleLivePayload | { message?: string };

  if (!response.ok || !('moneyMovement' in payload)) {
    throw new Error('message' in payload ? payload.message : 'Console live data could not be loaded.');
  }

  return payload;
}

async function postPoolNavMarkRequest(formData: FormData): Promise<{ message: string; status: string }> {
  const response = await fetch('/api/console/pool-nav-marks', {
    body: formData,
    headers: {
      Accept: 'application/json',
    },
    method: 'POST',
  });
  const payload = (await response.json()) as { message?: string; status?: string };

  if (!response.ok) {
    throw new Error(payload.message ?? 'Pool NAV mark could not be posted.');
  }

  return {
    message: payload.message ?? 'Pool NAV mark posted.',
    status: payload.status ?? 'posted',
  };
}

function StatCard({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string | number;
  tone?: 'neutral' | 'amber' | 'green' | 'red';
}) {
  const valueClass =
    tone === 'green'
      ? 'text-emerald-200'
      : tone === 'amber'
        ? 'text-amber-100'
        : tone === 'red'
          ? 'text-red-100'
          : 'text-neutral-50';

  return (
    <div className="rounded-lg border border-neutral-800 bg-[#181715] p-5">
      <span className="text-sm text-neutral-500">{label}</span>
      <strong className={`mt-2 block text-3xl font-semibold ${valueClass}`}>{value}</strong>
    </div>
  );
}

function InlineMetric({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string | number;
  tone?: 'neutral' | 'amber' | 'green' | 'red';
}) {
  const valueClass =
    tone === 'green'
      ? 'text-emerald-200'
      : tone === 'amber'
        ? 'text-amber-100'
        : tone === 'red'
          ? 'text-red-100'
          : 'text-neutral-50';

  return (
    <div className="rounded-md border border-neutral-800 bg-neutral-950/30 p-3">
      <span className="text-xs text-neutral-500">{label}</span>
      <strong className={`mt-1 block text-lg font-semibold ${valueClass}`}>{value}</strong>
    </div>
  );
}

function StatusCheck({
  label,
  tone,
  value,
}: {
  label: string;
  tone: 'green' | 'amber' | 'red';
  value: string;
}) {
  return (
    <div className="rounded-md border border-neutral-800 bg-neutral-950/30 p-3">
      <span className="text-xs text-neutral-500">{label}</span>
      <strong className={`mt-1 block text-sm font-semibold ${getHealthTextClass(tone)}`}>{value}</strong>
    </div>
  );
}

type HealthIssue = {
  detail: string;
  label: string;
  tone: 'amber' | 'red';
};

function getDefaultAmount(value: number | undefined) {
  return (value ?? 0).toFixed(2);
}

function NumberField({
  allowNegative = false,
  defaultValue,
  label,
  name,
}: {
  allowNegative?: boolean;
  defaultValue: string;
  label: string;
  name: string;
}) {
  return (
    <label className="grid gap-1">
      <span className="text-xs text-neutral-500">{label}</span>
      <input
        className="h-10 rounded-md border border-neutral-800 bg-neutral-950/40 px-3 text-sm text-neutral-50 outline-none transition-colors placeholder:text-neutral-600 focus:border-neutral-600"
        defaultValue={defaultValue}
        min={allowNegative ? undefined : 0}
        name={name}
        step="0.01"
        type="number"
      />
    </label>
  );
}

function PoolNavMarkCard({ poolMark }: { poolMark: PoolMarkingPool }) {
  const queryClient = useQueryClient();
  const [statusMessage, setStatusMessage] = useState('');
  const latestNav = poolMark.latestNav;
  const mutation = useMutation({
    mutationFn: postPoolNavMarkRequest,
    onError(error) {
      setStatusMessage(error.message);
    },
    onMutate() {
      setStatusMessage('');
    },
    onSuccess(payload) {
      setStatusMessage(payload.message);
      queryClient.invalidateQueries({ queryKey: consoleLiveQueryKey });
    },
  });
  const grossEquity = latestNav?.grossEquity ?? poolMark.totalPositionEquity;
  const cashBalance = latestNav?.cashBalance ?? grossEquity;
  const allocatedCapital = latestNav?.allocatedCapital ?? 0;
  const reservedMargin = latestNav?.reservedMargin ?? 0;
  const realizedPnl = latestNav?.realizedPnl ?? 0;
  const unrealizedPnl = latestNav?.unrealizedPnl ?? 0;
  const fees = latestNav?.fees ?? 0;
  const funding = latestNav?.funding ?? 0;

  return (
    <article className="rounded-md border border-neutral-800 bg-neutral-950/30 p-5">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-neutral-400">{poolMark.pool.riskProfile}</p>
            <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${getMoneyStatusClass(poolMark.pool.status)}`}>
              {formatConstant(poolMark.pool.status)}
            </span>
          </div>
          <h3 className="mt-1 text-lg font-semibold text-neutral-50">{poolMark.pool.name}</h3>
          <p className="mt-2 text-sm leading-6 text-neutral-500">
            {latestNav ? `Last marked ${formatDate(latestNav.effectiveAt)}` : 'No NAV mark recorded yet.'}
          </p>
        </div>
        <div className="grid gap-1 text-sm lg:text-right">
          <span className="text-neutral-500">NAV / unit</span>
          <strong className="text-2xl font-semibold text-neutral-50">
            {latestNav ? formatNav(latestNav.navPerUnit) : '1.0000'}
          </strong>
          <span className="text-xs text-neutral-500">{formatUnits(latestNav?.totalUnits ?? poolMark.totalPositionUnits)} units</span>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <InlineMetric label="Pool equity" value={formatCurrency(grossEquity)} tone={grossEquity > 0 ? 'green' : 'neutral'} />
        <InlineMetric label="Cash" value={formatCurrency(cashBalance)} />
        <InlineMetric label="In strategy" value={formatCurrency(allocatedCapital)} />
        <InlineMetric label="Open PnL" value={formatCurrency(unrealizedPnl)} tone={unrealizedPnl > 0 ? 'green' : unrealizedPnl < 0 ? 'red' : 'neutral'} />
      </div>

      <form
        key={`${poolMark.pool.id}-${latestNav?.id ?? 'empty'}`}
        className="mt-5 grid gap-4 border-t border-neutral-800 pt-5"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate(new FormData(event.currentTarget));
        }}
      >
        <input type="hidden" name="poolId" value={poolMark.pool.id} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <NumberField defaultValue={getDefaultAmount(grossEquity)} label="Total equity" name="grossEquity" />
          <NumberField defaultValue={getDefaultAmount(cashBalance)} label="Cash balance" name="cashBalance" />
          <NumberField defaultValue={getDefaultAmount(allocatedCapital)} label="Allocated capital" name="allocatedCapital" />
          <NumberField defaultValue={getDefaultAmount(reservedMargin)} label="Reserved margin" name="reservedMargin" />
          <NumberField allowNegative defaultValue={getDefaultAmount(realizedPnl)} label="Realized PnL" name="realizedPnl" />
          <NumberField allowNegative defaultValue={getDefaultAmount(unrealizedPnl)} label="Open PnL" name="unrealizedPnl" />
          <NumberField defaultValue={getDefaultAmount(fees)} label="Fees" name="fees" />
          <NumberField defaultValue={getDefaultAmount(funding)} label="Funding" name="funding" />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm leading-6 text-neutral-500" aria-live="polite">
            {statusMessage || 'Posting creates a new append-only pool NAV snapshot.'}
          </p>
          <button
            className="inline-flex h-10 items-center justify-center rounded-md bg-neutral-100 px-4 text-sm font-medium text-neutral-950 transition-colors hover:bg-white disabled:opacity-50"
            disabled={mutation.isPending}
            type="submit"
          >
            {mutation.isPending ? 'Posting' : 'Post mark'}
          </button>
        </div>
      </form>
    </article>
  );
}

function ConsoleLivePanelsContent({ initialData }: ConsoleLivePanelsProps) {
  const { data, error, isFetching } = useQuery({
    initialData,
    queryFn: getConsoleLivePayload,
    queryKey: consoleLiveQueryKey,
    refetchInterval: refreshIntervalMs,
    refetchOnWindowFocus: true,
    staleTime: 2_000,
  });
  const moneyMovement = data.moneyMovement;
  const poolMarking = data.poolMarking;
  const liveLedgerOverview = data.ledgerOverview;
  const postedDeposits = moneyMovement.deposits.filter((deposit) => deposit.status === 'posted');
  const availableSettlements = moneyMovement.stripeSettlements.filter((settlement) => settlement.status === 'available');
  const pendingSettlements = moneyMovement.stripeSettlements.filter((settlement) => settlement.status === 'pending');
  const availableSettlementNet = availableSettlements.reduce((total, settlement) => total + settlement.netAmount, 0);
  const pendingSettlementNet = pendingSettlements.reduce((total, settlement) => total + settlement.netAmount, 0);
  const queuedTreasuryTasks = moneyMovement.treasuryTasks.filter((task) => activeTreasuryStatuses.includes(task.status));
  const queuedTreasuryAmount = queuedTreasuryTasks.reduce((total, task) => total + task.amount, 0);
  const failedSessions = moneyMovement.stripeSessions.filter((session) => session.status === 'failed');
  const failedDeposits = moneyMovement.deposits.filter((deposit) => deposit.status === 'failed');
  const failedTreasuryTasks = moneyMovement.treasuryTasks.filter((task) => task.status === 'FAILED');
  const unavailableSettlements = moneyMovement.stripeSettlements.filter((settlement) => settlement.status === 'unavailable');
  const voidEntries = moneyMovement.entries.filter((entry) => entry.status === 'void');
  const poolEquity = poolMarking.pools.reduce((total, pool) => total + (pool.latestNav?.grossEquity ?? 0), 0);
  const poolOpenPnl = poolMarking.pools.reduce((total, pool) => total + (pool.latestNav?.unrealizedPnl ?? 0), 0);
  const poolTotalUnits = poolMarking.pools.reduce((total, pool) => total + (pool.latestNav?.totalUnits ?? 0), 0);
  const activePools = poolMarking.pools.filter((pool) => pool.pool.status === 'ACTIVE');
  const healthIssues: HealthIssue[] = [
    ...(error
      ? [
          {
            detail: error.message,
            label: 'Live console feed failed',
            tone: 'red' as const,
          },
        ]
      : []),
    ...(!moneyMovement.available
      ? [
          {
            detail: 'The console cannot read money movement records.',
            label: 'Money movement unavailable',
            tone: 'red' as const,
          },
        ]
      : []),
    ...(failedSessions.length
      ? [
          {
            detail: `${failedSessions.length} Stripe checkout ${failedSessions.length === 1 ? 'session has' : 'sessions have'} failed.`,
            label: 'Stripe session failure',
            tone: 'red' as const,
          },
        ]
      : []),
    ...(failedDeposits.length
      ? [
          {
            detail: `${failedDeposits.length} deposit ${failedDeposits.length === 1 ? 'has' : 'have'} failed before posting.`,
            label: 'Deposit failure',
            tone: 'red' as const,
          },
        ]
      : []),
    ...(failedTreasuryTasks.length
      ? [
          {
            detail: `${failedTreasuryTasks.length} treasury ${failedTreasuryTasks.length === 1 ? 'task needs' : 'tasks need'} investigation.`,
            label: 'Treasury task failed',
            tone: 'red' as const,
          },
        ]
      : []),
    ...(unavailableSettlements.length
      ? [
          {
            detail: `${unavailableSettlements.length} Stripe settlement ${unavailableSettlements.length === 1 ? 'is' : 'are'} unavailable.`,
            label: 'Settlement unavailable',
            tone: 'red' as const,
          },
        ]
      : []),
    ...(voidEntries.length
      ? [
          {
            detail: `${voidEntries.length} ledger ${voidEntries.length === 1 ? 'entry is' : 'entries are'} void.`,
            label: 'Ledger entry voided',
            tone: 'red' as const,
          },
        ]
      : []),
    ...(liveLedgerOverview.reconciliationStatus !== 'Matched'
      ? [
          {
            detail: 'Deposit totals and posted ledger entries do not match.',
            label: 'Ledger reconciliation review',
            tone: 'amber' as const,
          },
        ]
      : []),
    ...(!moneyMovement.treasuryQueueAvailable
      ? [
          {
            detail: 'Treasury tasks cannot be queued until the treasury table exists.',
            label: 'Treasury queue not installed',
            tone: 'amber' as const,
          },
        ]
      : []),
    ...(!moneyMovement.settlementTrackingAvailable
      ? [
          {
            detail: 'Stripe fees, net funds, and availability dates are not being tracked yet.',
            label: 'Settlement tracking not installed',
            tone: 'amber' as const,
          },
        ]
      : []),
    ...(!poolMarking.available
      ? [
          {
            detail: 'Pool NAV marks cannot be read until pool unit accounting is installed.',
            label: 'Pool NAV unavailable',
            tone: 'amber' as const,
          },
        ]
      : []),
  ];
  const healthTone = healthIssues.reduce<'green' | 'amber' | 'red'>(
    (current, issue) => (getToneRank(issue.tone) > getToneRank(current) ? issue.tone : current),
    'green',
  );
  const healthTitle =
    healthTone === 'red' ? 'Issue detected' : healthTone === 'amber' ? 'Review required' : 'All clear';
  const healthSummary =
    healthTone === 'red'
      ? 'A money movement path has a blocking issue.'
      : healthTone === 'amber'
        ? 'Money is moving, but at least one control needs review.'
        : 'Ledger, settlement tracking, and treasury queue are operating normally.';

  return (
    <>
      <section className={`rounded-lg border p-6 sm:p-8 ${getHealthPanelClass(healthTone)}`} aria-labelledby="operations-status-heading">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm font-medium text-neutral-300">Operations Status</p>
              <span className="inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-950/40 px-2.5 py-1 text-xs text-neutral-400">
                <span
                  aria-hidden="true"
                  className={`h-1.5 w-1.5 rounded-full ${isFetching ? 'bg-amber-300' : 'bg-emerald-300'}`}
                />
                {isFetching ? 'Updating' : 'Live'}
                <span className="text-neutral-600">5s</span>
              </span>
            </div>
            <h1 id="operations-status-heading" className={`mt-2 text-4xl font-semibold tracking-normal sm:text-5xl ${getHealthTextClass(healthTone)}`}>
              {healthTitle}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-neutral-300">{healthSummary}</p>
          </div>
          <div className="grid gap-2 text-sm text-neutral-400 lg:text-right">
            <span>Last update {formatTime(data.generatedAt)}</span>
            <span>{formatDate(data.generatedAt)}</span>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <StatusCheck
            label="Ledger"
            value={liveLedgerOverview.reconciliationStatus}
            tone={liveLedgerOverview.reconciliationStatus === 'Matched' ? 'green' : 'amber'}
          />
          <StatusCheck label="Money records" value={moneyMovement.available ? 'Readable' : 'Unavailable'} tone={moneyMovement.available ? 'green' : 'red'} />
          <StatusCheck
            label="Stripe settlement"
            value={moneyMovement.settlementTrackingAvailable ? 'Tracked' : 'Missing table'}
            tone={moneyMovement.settlementTrackingAvailable ? 'green' : 'amber'}
          />
          <StatusCheck
            label="Treasury queue"
            value={moneyMovement.treasuryQueueAvailable ? 'Online' : 'Missing table'}
            tone={moneyMovement.treasuryQueueAvailable ? 'green' : 'amber'}
          />
          <StatusCheck
            label="Pool NAV"
            value={poolMarking.available ? 'Markable' : 'Missing table'}
            tone={poolMarking.available ? 'green' : 'amber'}
          />
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7" aria-label="Money overview">
        <StatCard label="Ledger balance" value={formatCurrency(liveLedgerOverview.balance)} tone={liveLedgerOverview.reconciliationStatus === 'Matched' ? 'green' : 'amber'} />
        <StatCard label="Deposited" value={formatCurrency(liveLedgerOverview.totalDeposited)} />
        <StatCard label="Pool equity" value={formatCurrency(poolEquity)} tone={poolMarking.available ? 'green' : 'amber'} />
        <StatCard
          label="Available net"
          value={formatCurrency(availableSettlementNet)}
          tone={availableSettlements.length ? 'green' : 'neutral'}
        />
        <StatCard
          label="Pending settlement"
          value={formatCurrency(pendingSettlementNet)}
          tone={pendingSettlements.length ? 'amber' : 'neutral'}
        />
        <StatCard
          label="Treasury queue"
          value={formatCurrency(queuedTreasuryAmount)}
          tone={queuedTreasuryTasks.length ? 'amber' : 'green'}
        />
        <StatCard
          label="Reconciliation"
          value={liveLedgerOverview.reconciliationStatus}
          tone={liveLedgerOverview.reconciliationStatus === 'Matched' ? 'green' : 'amber'}
        />
      </section>

      <section className="rounded-lg border border-neutral-800 bg-[#181715] p-6 sm:p-8" aria-labelledby="pool-nav-heading">
        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm font-medium text-neutral-400">Pool NAV</p>
              <span className="inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-950/40 px-2.5 py-1 text-xs text-neutral-500">
                <span
                  aria-hidden="true"
                  className={`h-1.5 w-1.5 rounded-full ${isFetching ? 'bg-amber-300' : 'bg-emerald-300'}`}
                />
                {isFetching ? 'Updating' : 'Live'}
                <span className="text-neutral-600">5s</span>
              </span>
            </div>
            <h2 id="pool-nav-heading" className="mt-1 text-2xl font-semibold text-neutral-50">
              Pool NAV Marking V1
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-400">
              Mark total pool equity and current balances. The system derives NAV per unit and refreshes user
              positions from the pool unit ledger.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <InlineMetric label="Active pools" value={activePools.length} tone={poolMarking.available ? 'green' : 'amber'} />
            <InlineMetric label="Pool equity" value={formatCurrency(poolEquity)} tone={poolEquity > 0 ? 'green' : 'neutral'} />
            <InlineMetric label="Open PnL" value={formatCurrency(poolOpenPnl)} tone={poolOpenPnl > 0 ? 'green' : poolOpenPnl < 0 ? 'red' : 'neutral'} />
            <InlineMetric label="Total units" value={formatUnits(poolTotalUnits)} />
          </div>
        </div>

        {!poolMarking.available ? (
          <div className="mt-5 rounded-md border border-amber-300/25 bg-amber-300/10 px-4 py-3 text-sm leading-6 text-amber-100">
            Pool unit accounting is not installed yet. Run <span className="font-mono">supabase/pool-unit-accounting-v1.sql</span>
            {' '}to enable NAV marks and user pool projections.
          </div>
        ) : poolMarking.pools.length ? (
          <div className="mt-6 grid gap-4">
            {poolMarking.pools.map((poolMark) => (
              <PoolNavMarkCard key={poolMark.pool.id} poolMark={poolMark} />
            ))}
          </div>
        ) : (
          <p className="mt-5 rounded-md border border-neutral-800 bg-neutral-950/30 px-4 py-3 text-sm text-neutral-500">
            No strategy pools are available.
          </p>
        )}
      </section>

      <section className="rounded-lg border border-neutral-800 bg-[#181715] p-6 sm:p-8" aria-labelledby="exceptions-heading">
        <div className="grid gap-4 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
          <div>
            <p className="text-sm font-medium text-neutral-400">Exceptions</p>
            <h2 id="exceptions-heading" className="mt-1 text-2xl font-semibold text-neutral-50">
              {healthIssues.length ? `${healthIssues.length} active ${healthIssues.length === 1 ? 'signal' : 'signals'}` : 'No active exceptions'}
            </h2>
          </div>
          <div className="grid gap-3">
            {healthIssues.length ? (
              healthIssues.map((issue) => (
                <article key={`${issue.label}-${issue.detail}`} className={`rounded-md border px-4 py-3 ${getHealthPanelClass(issue.tone)}`}>
                  <strong className={`block text-sm font-semibold ${getHealthTextClass(issue.tone)}`}>{issue.label}</strong>
                  <p className="mt-1 text-sm leading-6 text-neutral-300">{issue.detail}</p>
                </article>
              ))
            ) : (
              <p className="rounded-md border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm leading-6 text-emerald-100">
                No failed deposits, unavailable settlements, failed treasury tasks, or reconciliation breaks detected.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-neutral-800 bg-[#181715] p-6 sm:p-8" aria-labelledby="money-movement-heading">
        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm font-medium text-neutral-400">Money Movement</p>
              <span className="inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-950/40 px-2.5 py-1 text-xs text-neutral-500">
                <span
                  aria-hidden="true"
                  className={`h-1.5 w-1.5 rounded-full ${isFetching ? 'bg-amber-300' : 'bg-emerald-300'}`}
                />
                {isFetching ? 'Updating' : 'Live'}
                <span className="text-neutral-600">5s</span>
                <span className="text-neutral-600">{formatTime(data.generatedAt)}</span>
              </span>
            </div>
            <h2 id="money-movement-heading" className="mt-1 text-2xl font-semibold text-neutral-50">
              Deposit pipeline
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-400">
              Stripe sessions, settlement availability, posted deposits, ledger entries, and automated treasury state in
              one operating view.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <InlineMetric label="Stripe sessions" value={moneyMovement.stripeSessions.length} />
            <InlineMetric label="Posted deposits" value={postedDeposits.length} tone="green" />
            <InlineMetric
              label="Available net"
              value={formatCurrency(availableSettlementNet)}
              tone={availableSettlements.length ? 'green' : 'neutral'}
            />
            <InlineMetric
              label="Pending settlement"
              value={pendingSettlements.length}
              tone={pendingSettlements.length ? 'amber' : 'neutral'}
            />
            <InlineMetric label="Treasury queue" value={queuedTreasuryTasks.length} tone={queuedTreasuryTasks.length ? 'amber' : 'neutral'} />
          </div>
        </div>

        {error ? (
          <div className="mt-5 rounded-md border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm leading-6 text-red-100">
            {error.message}
          </div>
        ) : !moneyMovement.available ? (
          <div className="mt-5 rounded-md border border-amber-300/25 bg-amber-300/10 px-4 py-3 text-sm leading-6 text-amber-100">
            Live money movement records are unavailable. Confirm the production service-role key is configured before
            using this console for deposit debugging.
          </div>
        ) : !moneyMovement.treasuryQueueAvailable ? (
          <div className="mt-5 rounded-md border border-amber-300/25 bg-amber-300/10 px-4 py-3 text-sm leading-6 text-amber-100">
            Treasury queue table is not installed yet. Run <span className="font-mono">supabase/treasury-queue-v1.sql</span>
            {' '}to begin queueing funding tasks after deposits post.
          </div>
        ) : !moneyMovement.settlementTrackingAvailable ? (
          <div className="mt-5 rounded-md border border-amber-300/25 bg-amber-300/10 px-4 py-3 text-sm leading-6 text-amber-100">
            Stripe settlement tracking is not installed yet. Run <span className="font-mono">supabase/stripe-settlement-v1.sql</span>
            {' '}to track Stripe fees, net funds, and availability dates before treasury funding.
          </div>
        ) : null}
        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          <article className="rounded-md border border-neutral-800 bg-neutral-950/30 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-neutral-400">Stripe Sessions</p>
                <h3 className="mt-1 text-lg font-semibold text-neutral-50">Checkout lifecycle</h3>
              </div>
              <span className="text-xs text-neutral-500">{moneyMovement.available ? formatDate(moneyMovement.generatedAt) : 'Unavailable'}</span>
            </div>
            <div className="mt-5 grid gap-4">
              {moneyMovement.stripeSessions.length ? (
                moneyMovement.stripeSessions.slice(0, 5).map((session) => (
                  <div key={session.id} className="grid gap-3 border-t border-neutral-800 pt-4 first:border-t-0 first:pt-0 sm:grid-cols-[1fr_auto]">
                    <div className="min-w-0">
                      <strong className="block break-all text-sm font-semibold text-neutral-50">{shortenId(session.id)}</strong>
                      <span className="mt-1 block text-xs text-neutral-500">Account {shortenId(session.accountId)}</span>
                      <span className="mt-1 block text-xs text-neutral-500">Intent {shortenId(session.paymentIntentId)}</span>
                    </div>
                    <div className="grid gap-2 sm:justify-items-end">
                      <span className={`w-fit rounded-full border px-2.5 py-0.5 text-xs font-medium ${getMoneyStatusClass(session.status)}`}>
                        {formatConstant(session.status)}
                      </span>
                      <strong className="text-sm font-semibold text-neutral-50">{formatCurrency(session.amount)}</strong>
                      <time className="text-xs text-neutral-500" dateTime={session.updatedAt}>
                        {formatDate(session.updatedAt)}
                      </time>
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-md border border-neutral-800 bg-[#181715] p-4 text-sm text-neutral-500">
                  No Stripe sessions recorded yet.
                </p>
              )}
            </div>
          </article>

          <article className="rounded-md border border-neutral-800 bg-neutral-950/30 p-5">
            <p className="text-sm font-medium text-neutral-400">Stripe Settlement</p>
            <h3 className="mt-1 text-lg font-semibold text-neutral-50">Treasury availability</h3>
            <div className="mt-5 grid gap-4">
              {moneyMovement.stripeSettlements.length ? (
                moneyMovement.stripeSettlements.slice(0, 5).map((settlement) => (
                  <div key={settlement.id} className="grid gap-3 border-t border-neutral-800 pt-4 first:border-t-0 first:pt-0 sm:grid-cols-[1fr_auto]">
                    <div className="min-w-0">
                      <strong className="block break-all text-sm font-semibold text-neutral-50">{shortenId(settlement.balanceTransactionId)}</strong>
                      <span className="mt-1 block text-xs text-neutral-500">Checkout {shortenId(settlement.checkoutSessionId)}</span>
                      <span className="mt-1 block text-xs text-neutral-500">Charge {shortenId(settlement.chargeId)}</span>
                      <div className="mt-3 grid gap-2 text-xs text-neutral-500 sm:grid-cols-3">
                        <span>Gross {formatCurrency(settlement.grossAmount)}</span>
                        <span>Fee {formatCurrency(settlement.stripeFeeAmount)}</span>
                        <span>Net {formatCurrency(settlement.netAmount)}</span>
                      </div>
                    </div>
                    <div className="grid gap-2 sm:justify-items-end">
                      <span className={`w-fit rounded-full border px-2.5 py-0.5 text-xs font-medium ${getMoneyStatusClass(settlement.status)}`}>
                        {formatConstant(settlement.status)}
                      </span>
                      <strong className="text-sm font-semibold text-neutral-50">{formatCurrency(settlement.netAmount)}</strong>
                      <time className="text-xs text-neutral-500" dateTime={settlement.availableOn ?? settlement.updatedAt}>
                        {settlement.availableOn ? `Available ${formatDate(settlement.availableOn)}` : formatDate(settlement.updatedAt)}
                      </time>
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-md border border-neutral-800 bg-[#181715] p-4 text-sm text-neutral-500">
                  No Stripe settlement records yet.
                </p>
              )}
            </div>
          </article>

          <article className="rounded-md border border-neutral-800 bg-neutral-950/30 p-5">
            <p className="text-sm font-medium text-neutral-400">Posted Deposits</p>
            <h3 className="mt-1 text-lg font-semibold text-neutral-50">Money accepted into ledger</h3>
            <div className="mt-5 grid gap-4">
              {moneyMovement.deposits.length ? (
                moneyMovement.deposits.slice(0, 5).map((deposit) => (
                  <div key={deposit.id} className="grid gap-3 border-t border-neutral-800 pt-4 first:border-t-0 first:pt-0 sm:grid-cols-[1fr_auto]">
                    <div className="min-w-0">
                      <strong className="block break-all text-sm font-semibold text-neutral-50">{shortenId(deposit.id)}</strong>
                      <span className="mt-1 block text-xs text-neutral-500">Account {shortenId(deposit.accountId)}</span>
                      <span className="mt-1 block text-xs text-neutral-500">Reference {shortenId(deposit.providerReference)}</span>
                    </div>
                    <div className="grid gap-2 sm:justify-items-end">
                      <span className={`w-fit rounded-full border px-2.5 py-0.5 text-xs font-medium ${getMoneyStatusClass(deposit.status)}`}>
                        {formatConstant(deposit.status)}
                      </span>
                      <strong className="text-sm font-semibold text-emerald-200">{formatCurrency(deposit.amount)}</strong>
                      <time className="text-xs text-neutral-500" dateTime={deposit.postedAt ?? deposit.createdAt}>
                        {formatDate(deposit.postedAt ?? deposit.createdAt)}
                      </time>
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-md border border-neutral-800 bg-[#181715] p-4 text-sm text-neutral-500">
                  No posted deposits yet.
                </p>
              )}
            </div>
          </article>

          <article className="rounded-md border border-neutral-800 bg-neutral-950/30 p-5">
            <p className="text-sm font-medium text-neutral-400">Ledger Entries</p>
            <h3 className="mt-1 text-lg font-semibold text-neutral-50">Accounting events</h3>
            <div className="mt-5 grid gap-4">
              {moneyMovement.entries.length ? (
                moneyMovement.entries.slice(0, 5).map((entry) => (
                  <div key={entry.id} className="grid gap-3 border-t border-neutral-800 pt-4 first:border-t-0 first:pt-0 sm:grid-cols-[1fr_auto]">
                    <div className="min-w-0">
                      <strong className="block text-sm font-semibold text-neutral-50">{formatConstant(entry.type)}</strong>
                      <span className="mt-1 block text-xs text-neutral-500">{entry.description}</span>
                      <span className="mt-1 block text-xs text-neutral-500">Source {formatConstant(entry.source)}</span>
                    </div>
                    <div className="grid gap-2 sm:justify-items-end">
                      <span className={`w-fit rounded-full border px-2.5 py-0.5 text-xs font-medium ${getMoneyStatusClass(entry.status)}`}>
                        {formatConstant(entry.status)}
                      </span>
                      <strong className="text-sm font-semibold text-neutral-50">{formatCurrency(entry.amount)}</strong>
                      <time className="text-xs text-neutral-500" dateTime={entry.effectiveAt}>
                        {formatDate(entry.effectiveAt)}
                      </time>
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-md border border-neutral-800 bg-[#181715] p-4 text-sm text-neutral-500">
                  No ledger entries posted yet.
                </p>
              )}
            </div>
          </article>

          <article className="rounded-md border border-neutral-800 bg-neutral-950/30 p-5">
            <p className="text-sm font-medium text-neutral-400">Treasury Queue</p>
            <h3 className="mt-1 text-lg font-semibold text-neutral-50">Automated funding state</h3>
            <div className="mt-5 grid gap-4">
              {moneyMovement.treasuryTasks.length ? (
                moneyMovement.treasuryTasks.slice(0, 5).map((task) => (
                  <div key={task.id} className="grid gap-3 border-t border-neutral-800 pt-4 first:border-t-0 first:pt-0 sm:grid-cols-[1fr_auto]">
                    <div className="min-w-0">
                      <strong className="block text-sm font-semibold text-neutral-50">{formatConstant(task.type)}</strong>
                      <span className="mt-1 block text-xs text-neutral-500">Deposit {shortenId(task.depositId)}</span>
                      <span className="mt-1 block text-xs text-neutral-500">Checkout {shortenId(task.checkoutSessionId)}</span>
                      {task.notes ? <span className="mt-2 block text-xs leading-5 text-neutral-400">{task.notes}</span> : null}
                    </div>
                    <div className="grid gap-2 sm:justify-items-end">
                      <span className={`w-fit rounded-full border px-2.5 py-0.5 text-xs font-medium ${getMoneyStatusClass(task.status)}`}>
                        {formatConstant(task.status)}
                      </span>
                      <strong className="text-sm font-semibold text-neutral-50">{formatCurrency(task.amount)}</strong>
                      <time className="text-xs text-neutral-500" dateTime={task.updatedAt}>
                        {formatDate(task.updatedAt)}
                      </time>
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-md border border-neutral-800 bg-[#181715] p-4 text-sm text-neutral-500">
                  No treasury tasks queued yet.
                </p>
              )}
            </div>
          </article>
        </div>
      </section>
    </>
  );
}

export default function ConsoleLivePanels(props: ConsoleLivePanelsProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: true,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ConsoleLivePanelsContent {...props} />
    </QueryClientProvider>
  );
}
