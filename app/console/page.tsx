import type { Metadata } from 'next';
import Link from 'next/link';

import Mark from '@/app/Mark';
import { listAccessRequests } from '@/features/access-review/store';
import type { AccessRequestStatus, AccessReviewRecommendation, HermesAccessRequest } from '@/features/access-review/types';
import { getStoredRiskProfile } from '@/features/hermes-dashboard/preferences';
import { getHermesDashboardSnapshot } from '@/features/hermes-dashboard/read-model';
import type { DashboardFieldSource, DashboardFieldSourceStatus } from '@/features/hermes-dashboard/types';
import { listMoneyMovementRecords } from '@/features/ledger/money-movement';
import { getLedgerReadModel } from '@/features/ledger/read-model';
import type { TreasuryTaskStatus } from '@/features/ledger/types';
import { hasConsoleAccess } from '@/features/solace-console/access';

import ConsoleAccessGate from './ConsoleAccessGate';
import ConsoleLiveRefresh from './ConsoleLiveRefresh';

export const metadata: Metadata = {
  title: 'Solace — Console',
  description: 'Internal Solace operator console for contracts, systems, and dashboard source state.',
};

type ConsolePageProps = {
  searchParams?: Promise<{
    access?: string | string[];
    email?: string | string[];
    notification?: string | string[];
    review?: string | string[];
    treasury?: string | string[];
  }>;
};

type OwnerSummary = {
  ownerLabel: string;
  fields: DashboardFieldSource[];
};

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

const currencyFormatter = new Intl.NumberFormat('en-US', {
  currency: 'USD',
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  style: 'currency',
});

const numberFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 2,
});

function formatDate(value: string) {
  return dateFormatter.format(new Date(value));
}

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

function formatPercent(value: number) {
  return `${numberFormatter.format(value)}%`;
}

function formatConstant(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function countStatuses(fieldSources: DashboardFieldSource[]) {
  return fieldSources.reduce<Record<DashboardFieldSourceStatus, number>>(
    (counts, source) => ({
      ...counts,
      [source.status]: counts[source.status] + 1,
    }),
    { live: 0, mock: 0, planned: 0 },
  );
}

function groupByOwner(fieldSources: DashboardFieldSource[]) {
  return fieldSources.reduce<OwnerSummary[]>((owners, source) => {
    const existing = owners.find((owner) => owner.ownerLabel === source.ownerLabel);

    if (existing) {
      existing.fields.push(source);
      return owners;
    }

    return [...owners, { ownerLabel: source.ownerLabel, fields: [source] }];
  }, []);
}

function getOwnerState(fields: DashboardFieldSource[]) {
  if (fields.every((field) => field.status === 'live')) {
    return 'Live';
  }

  if (fields.some((field) => field.status === 'live')) {
    return 'Partial';
  }

  if (fields.some((field) => field.status === 'planned')) {
    return 'Planned';
  }

  return 'Mock';
}

function getOwnerStateClass(state: string) {
  if (state === 'Live') {
    return 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200';
  }

  if (state === 'Partial') {
    return 'border-sky-400/30 bg-sky-400/10 text-sky-200';
  }

  if (state === 'Planned') {
    return 'border-neutral-500/30 bg-neutral-500/10 text-neutral-200';
  }

  return 'border-amber-300/25 bg-amber-300/10 text-amber-100';
}

function getAccessStatusClass(status: AccessRequestStatus) {
  if (status === 'approved') {
    return 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200';
  }

  if (status === 'declined') {
    return 'border-red-400/30 bg-red-400/10 text-red-200';
  }

  if (status === 'more_info') {
    return 'border-sky-400/30 bg-sky-400/10 text-sky-200';
  }

  return 'border-amber-300/25 bg-amber-300/10 text-amber-100';
}

function getRecommendationClass(recommendation: AccessReviewRecommendation) {
  if (recommendation === 'APPROVE') {
    return 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200';
  }

  if (recommendation === 'DECLINE') {
    return 'border-red-400/30 bg-red-400/10 text-red-200';
  }

  return 'border-amber-300/25 bg-amber-300/10 text-amber-100';
}

function getMoneyStatusClass(status: string) {
  if (['posted', 'ACTIVE', 'COMPLETED', 'reconciled'].includes(status)) {
    return 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200';
  }

  if (['open', 'QUEUED', 'REVIEWING', 'APPROVED', 'SUBMITTED', 'PENDING_ACTIVATION'].includes(status)) {
    return 'border-amber-300/25 bg-amber-300/10 text-amber-100';
  }

  if (['failed', 'FAILED', 'CANCELED', 'expired', 'SUSPENDED', 'REVOKED'].includes(status)) {
    return 'border-red-400/30 bg-red-400/10 text-red-200';
  }

  return 'border-neutral-700 bg-neutral-950/40 text-neutral-300';
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

function countPendingReviews(requests: HermesAccessRequest[]) {
  return requests.filter((request) => request.status === 'review' || request.status === 'new').length;
}

function countAiApprovals(requests: HermesAccessRequest[]) {
  return requests.filter((request) => request.aiReview.recommendation === 'APPROVE').length;
}

function getLedgerAccountId(request: HermesAccessRequest) {
  return request.ledgerAccountId ?? request.accountId;
}

function AccessDecisionButton({
  children,
  decision,
  requestId,
  tone,
}: {
  children: string;
  decision: 'APPROVED' | 'DECLINED' | 'REQUEST_MORE_INFO';
  requestId: string;
  tone: 'green' | 'neutral' | 'red';
}) {
  const toneClass =
    tone === 'green'
      ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/15'
      : tone === 'red'
        ? 'border-red-400/30 bg-red-400/10 text-red-100 hover:bg-red-400/15'
        : 'border-neutral-700 bg-neutral-950/40 text-neutral-100 hover:bg-neutral-800';

  return (
    <form action="/api/console/access-requests" method="post">
      <input type="hidden" name="requestId" value={requestId} />
      <input type="hidden" name="decision" value={decision} />
      <button
        type="submit"
        className={`inline-flex h-9 w-full items-center justify-center rounded-md border px-3 text-sm font-medium transition-colors ${toneClass}`}
      >
        {children}
      </button>
    </form>
  );
}

function ResendApprovalEmailButton({ requestId }: { requestId: string }) {
  return (
    <form action="/api/console/access-requests/approval-email" method="post">
      <input type="hidden" name="requestId" value={requestId} />
      <button
        type="submit"
        className="inline-flex h-9 w-full items-center justify-center rounded-md border border-emerald-400/30 bg-emerald-400/10 px-3 text-sm font-medium text-emerald-100 transition-colors hover:bg-emerald-400/15"
      >
        Resend invite
      </button>
    </form>
  );
}

function InviteRecipientForm({ email, requestId }: { email: string; requestId: string }) {
  return (
    <form action="/api/console/access-requests/email" method="post" className="grid gap-2 rounded-md border border-neutral-800 bg-[#181715] p-3">
      <input type="hidden" name="requestId" value={requestId} />
      <label htmlFor={`invite-email-${requestId}`} className="text-xs uppercase tracking-[0.14em] text-neutral-500">
        Invite recipient
      </label>
      <input
        id={`invite-email-${requestId}`}
        name="email"
        type="email"
        required
        defaultValue={email}
        className="h-9 rounded-md border border-neutral-700 bg-[#10100e] px-3 text-sm text-neutral-100 outline-none transition-colors placeholder:text-neutral-600 focus:border-neutral-400"
      />
      <button
        type="submit"
        className="inline-flex h-9 w-full items-center justify-center rounded-md border border-neutral-700 px-3 text-sm font-medium text-neutral-200 transition-colors hover:border-neutral-500 hover:bg-neutral-900"
      >
        Update and send
      </button>
    </form>
  );
}

function getTreasuryTaskActions(status: TreasuryTaskStatus): Array<{ label: string; status: TreasuryTaskStatus; tone: 'green' | 'neutral' | 'red' }> {
  switch (status) {
    case 'QUEUED':
      return [
        { label: 'Review', status: 'REVIEWING', tone: 'neutral' },
        { label: 'Cancel', status: 'CANCELED', tone: 'red' },
      ];
    case 'REVIEWING':
      return [
        { label: 'Approve', status: 'APPROVED', tone: 'green' },
        { label: 'Fail', status: 'FAILED', tone: 'red' },
      ];
    case 'APPROVED':
      return [
        { label: 'Submit', status: 'SUBMITTED', tone: 'green' },
        { label: 'Cancel', status: 'CANCELED', tone: 'red' },
      ];
    case 'SUBMITTED':
      return [
        { label: 'Complete', status: 'COMPLETED', tone: 'green' },
        { label: 'Fail', status: 'FAILED', tone: 'red' },
      ];
    default:
      return [];
  }
}

function TreasuryTaskActionButton({
  children,
  status,
  taskId,
  tone,
}: {
  children: string;
  status: TreasuryTaskStatus;
  taskId: string;
  tone: 'green' | 'neutral' | 'red';
}) {
  const toneClass =
    tone === 'green'
      ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/15'
      : tone === 'red'
        ? 'border-red-400/30 bg-red-400/10 text-red-100 hover:bg-red-400/15'
        : 'border-neutral-700 bg-[#181715] text-neutral-100 hover:bg-neutral-800';

  return (
    <form action="/api/console/treasury-tasks" method="post">
      <input type="hidden" name="taskId" value={taskId} />
      <input type="hidden" name="status" value={status} />
      <button
        type="submit"
        className={`inline-flex h-8 items-center justify-center rounded-md border px-3 text-xs font-medium transition-colors ${toneClass}`}
      >
        {children}
      </button>
    </form>
  );
}

function InlineMetric({ label, value, tone = 'neutral' }: { label: string; value: string | number; tone?: 'neutral' | 'amber' | 'green' }) {
  const valueClass =
    tone === 'green' ? 'text-emerald-200' : tone === 'amber' ? 'text-amber-100' : 'text-neutral-50';

  return (
    <div className="border-t border-neutral-800 pt-3 first:border-t-0 first:pt-0 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
      <span className="text-sm text-neutral-500">{label}</span>
      <strong className={`mt-2 block text-3xl font-semibold ${valueClass}`}>{value}</strong>
    </div>
  );
}

function StatCard({ label, value, tone = 'neutral' }: { label: string; value: string | number; tone?: 'neutral' | 'amber' | 'green' }) {
  const valueClass =
    tone === 'green' ? 'text-emerald-200' : tone === 'amber' ? 'text-amber-100' : 'text-neutral-50';

  return (
    <div className="rounded-lg border border-neutral-800 bg-[#181715] p-5">
      <span className="text-sm text-neutral-500">{label}</span>
      <strong className={`mt-2 block text-3xl font-semibold ${valueClass}`}>{value}</strong>
    </div>
  );
}

export default async function ConsolePage({ searchParams }: ConsolePageProps) {
  const accessGranted = await hasConsoleAccess();
  const params = await searchParams;

  if (!accessGranted) {
    const denied = Array.isArray(params?.access) ? params.access.includes('denied') : params?.access === 'denied';

    return <ConsoleAccessGate denied={denied} />;
  }

  const riskProfile = await getStoredRiskProfile();
  const snapshot = await getHermesDashboardSnapshot({ riskProfile });
  const ledger = await getLedgerReadModel();
  const moneyMovement = await listMoneyMovementRecords();
  const accessRequests = await listAccessRequests();
  const statusCounts = countStatuses(snapshot.fieldSources);
  const ownerSummaries = groupByOwner(snapshot.fieldSources);
  const reviewStatus = Array.isArray(params?.review) ? params.review[0] : params?.review;
  const notificationStatus = Array.isArray(params?.notification) ? params.notification[0] : params?.notification;
  const emailStatus = Array.isArray(params?.email) ? params.email[0] : params?.email;
  const treasuryStatus = Array.isArray(params?.treasury) ? params.treasury[0] : params?.treasury;
  const postedDeposits = moneyMovement.deposits.filter((deposit) => deposit.status === 'posted');
  const queuedTreasuryTasks = moneyMovement.treasuryTasks.filter((task) =>
    ['QUEUED', 'REVIEWING', 'APPROVED', 'SUBMITTED'].includes(task.status),
  );
  const activeAccounts = moneyMovement.accountStatuses.filter(
    (account) =>
      account.solaceUserStatus === 'ACTIVE' &&
      account.hermesAccountStatus === 'ACTIVE' &&
      account.ledgerAccountStatus === 'ACTIVE',
  );

  return (
    <main className="min-h-screen bg-[#10100e] text-neutral-50">
      <header className="sticky top-0 z-30 border-b border-neutral-800 bg-[#10100e]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-50">
            <Mark size={22} />
            Solace
          </Link>
          <div className="flex items-center gap-4">
            <ConsoleLiveRefresh />
            <nav className="flex items-center gap-4 text-sm text-neutral-400">
              <Link href="/dashboard" className="transition-colors hover:text-neutral-50">
                Dashboard
              </Link>
              <Link href="/dashboard/contract" className="transition-colors hover:text-neutral-50">
                Contracts
              </Link>
              <Link href="/hermes" className="hidden transition-colors hover:text-neutral-50 sm:inline">
                Hermes
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <section className="grid gap-6 rounded-lg border border-neutral-800 bg-[#181715] p-6 sm:p-8">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-sm font-medium text-neutral-400">Operator</p>
              <h1 className="mt-2 text-4xl font-semibold tracking-normal text-neutral-50 sm:text-5xl">
                Solace Console
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-neutral-400">
                Internal surface for contracts, system ownership, and source status. The console is deliberately
                operational: it shows what exists, who owns it, and what is still mocked.
              </p>
            </div>
            <div className="grid gap-2 text-sm text-neutral-400 lg:text-right">
              <span>{snapshot.contractVersion}</span>
              <span>Snapshot {formatDate(snapshot.generatedAt)}</span>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Console overview">
          <StatCard label="Dashboard fields" value={snapshot.fieldSources.length} />
          <StatCard label="Mock fields" value={statusCounts.mock} tone="amber" />
          <StatCard label="Live fields" value={statusCounts.live} tone="green" />
          <StatCard label="Owner systems" value={ownerSummaries.length} />
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Ledger overview">
          <StatCard label="Ledger balance" value={formatCurrency(ledger.portfolio.value)} tone="green" />
          <StatCard label="Deposited" value={formatCurrency(ledger.portfolio.totalDeposited)} />
          <StatCard label="Net profit" value={formatCurrency(ledger.portfolio.netProfit)} tone="green" />
          <StatCard
            label="Reconciliation"
            value={ledger.reconciliation.status === 'matched' ? 'Matched' : 'Review'}
            tone={ledger.reconciliation.status === 'matched' ? 'green' : 'amber'}
          />
        </section>

        <section className="rounded-lg border border-neutral-800 bg-[#181715] p-6 sm:p-8" aria-labelledby="money-movement-heading">
          <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <div>
              <p className="text-sm font-medium text-neutral-400">Money Movement</p>
              <h2 id="money-movement-heading" className="mt-1 text-2xl font-semibold text-neutral-50">
                Deposit pipeline
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-400">
                Stripe sessions, posted deposits, ledger entries, account activation, and treasury tasks in one control
                surface.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              <InlineMetric label="Stripe sessions" value={moneyMovement.stripeSessions.length} />
              <InlineMetric label="Posted deposits" value={postedDeposits.length} tone="green" />
              <InlineMetric label="Treasury queue" value={queuedTreasuryTasks.length} tone={queuedTreasuryTasks.length ? 'amber' : 'neutral'} />
              <InlineMetric label="Active accounts" value={activeAccounts.length} tone="green" />
            </div>
          </div>

          {!moneyMovement.available ? (
            <div className="mt-5 rounded-md border border-amber-300/25 bg-amber-300/10 px-4 py-3 text-sm leading-6 text-amber-100">
              Live money movement records are unavailable. Confirm the production service-role key is configured before
              using this console for deposit debugging.
            </div>
          ) : !moneyMovement.treasuryQueueAvailable ? (
            <div className="mt-5 rounded-md border border-amber-300/25 bg-amber-300/10 px-4 py-3 text-sm leading-6 text-amber-100">
              Treasury queue table is not installed yet. Run <span className="font-mono">supabase/treasury-queue-v1.sql</span>
              {' '}to begin queueing funding tasks after deposits post.
            </div>
          ) : null}
          {treasuryStatus === 'updated' ? (
            <div className="mt-5 rounded-md border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm leading-6 text-emerald-100">
              Treasury task updated.
            </div>
          ) : null}
          {treasuryStatus === 'failed' || treasuryStatus === 'invalid' ? (
            <div className="mt-5 rounded-md border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm leading-6 text-red-100">
              Treasury task could not be updated.
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
              <h3 className="mt-1 text-lg font-semibold text-neutral-50">Funding tasks</h3>
              <div className="mt-5 grid gap-4">
                {moneyMovement.treasuryTasks.length ? (
                  moneyMovement.treasuryTasks.slice(0, 5).map((task) => {
                    const actions = getTreasuryTaskActions(task.status);

                    return (
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
                        {actions.length ? (
                          <div className="flex flex-wrap gap-2 sm:col-span-2">
                            {actions.map((action) => (
                              <TreasuryTaskActionButton
                                key={`${task.id}-${action.status}`}
                                status={action.status}
                                taskId={task.id}
                                tone={action.tone}
                              >
                                {action.label}
                              </TreasuryTaskActionButton>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                ) : (
                  <p className="rounded-md border border-neutral-800 bg-[#181715] p-4 text-sm text-neutral-500">
                    No treasury tasks queued yet.
                  </p>
                )}
              </div>
            </article>
          </div>

          <article className="mt-4 rounded-md border border-neutral-800 bg-neutral-950/30 p-5">
            <p className="text-sm font-medium text-neutral-400">Account Activation</p>
            <h3 className="mt-1 text-lg font-semibold text-neutral-50">User, Hermes, ledger, and invite status</h3>
            <div className="mt-5 grid gap-3">
              {moneyMovement.accountStatuses.length ? (
                moneyMovement.accountStatuses.slice(0, 6).map((account) => {
                  const activationComplete =
                    account.solaceUserStatus === 'ACTIVE' &&
                    account.hermesAccountStatus === 'ACTIVE' &&
                    account.ledgerAccountStatus === 'ACTIVE';

                  return (
                    <div
                      key={account.accountId}
                      className="grid gap-4 rounded-md border border-neutral-800 bg-[#181715] p-4 lg:grid-cols-[1fr_auto]"
                    >
                      <div className="min-w-0">
                        <strong className="block text-sm font-semibold text-neutral-50">{account.userName}</strong>
                        <span className="mt-1 block text-xs text-neutral-500">{account.userEmail}</span>
                        <span className="mt-1 block text-xs text-neutral-500">{account.accountLabel}</span>
                      </div>
                      <div className="flex flex-wrap gap-2 lg:justify-end">
                        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${getMoneyStatusClass(account.solaceUserStatus)}`}>
                          User {formatConstant(account.solaceUserStatus)}
                        </span>
                        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${getMoneyStatusClass(account.hermesAccountStatus)}`}>
                          Hermes {formatConstant(account.hermesAccountStatus)}
                        </span>
                        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${getMoneyStatusClass(account.ledgerAccountStatus)}`}>
                          Ledger {formatConstant(account.ledgerAccountStatus)}
                        </span>
                        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${getMoneyStatusClass(account.dashboardInviteStatus ?? 'missing')}`}>
                          Invite {formatConstant(account.dashboardInviteStatus ?? 'missing')}
                        </span>
                        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${getMoneyStatusClass(activationComplete ? 'ACTIVE' : 'PENDING_ACTIVATION')}`}>
                          {activationComplete ? 'Ready' : 'Review'}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="rounded-md border border-neutral-800 bg-[#181715] p-4 text-sm text-neutral-500">
                  No account activation records available.
                </p>
              )}
            </div>
          </article>
        </section>

        <section className="grid gap-4" aria-labelledby="access-review-heading">
          <div className="grid gap-5 rounded-lg border border-neutral-800 bg-[#181715] p-6 sm:p-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <div>
              <p className="text-sm font-medium text-neutral-400">Access Review</p>
              <h2 id="access-review-heading" className="mt-1 text-2xl font-semibold text-neutral-50">
                AI analyst, human approval
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-neutral-400">
                Requests are scored for clarity, missing information, and operational risk. The model recommends; the
                console records the final human decision. Approved requests automatically receive a dashboard invite.
              </p>
              {reviewStatus === 'updated' ? (
                <p className="mt-4 rounded-md border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-100">
                  Access decision recorded.
                </p>
              ) : null}
              {notificationStatus === 'sent' ? (
                <p className="mt-3 rounded-md border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-100">
                  Approval email sent to the user.
                </p>
              ) : null}
              {notificationStatus === 'unconfigured' ? (
                <p className="mt-3 rounded-md border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
                  Access was approved, but SMTP is not configured. Send the invite code manually or add email env vars.
                </p>
              ) : null}
              {notificationStatus === 'failed' || notificationStatus === 'missing_invite' ? (
                <p className="mt-3 rounded-md border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-100">
                  Access was approved, but the approval email could not be sent.
                </p>
              ) : null}
              {emailStatus === 'updated' ? (
                <p className="mt-3 rounded-md border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-100">
                  Invite recipient updated.
                </p>
              ) : null}
              {emailStatus === 'invalid' || emailStatus === 'missing' ? (
                <p className="mt-3 rounded-md border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-100">
                  Invite recipient could not be updated.
                </p>
              ) : null}
              {reviewStatus === 'invalid' || reviewStatus === 'missing' ? (
                <p className="mt-4 rounded-md border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-100">
                  Access decision could not be recorded.
                </p>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-3 lg:self-end">
              <InlineMetric label="Requests" value={accessRequests.length} />
              <InlineMetric label="Pending review" value={countPendingReviews(accessRequests)} tone="amber" />
              <InlineMetric label="AI approve" value={countAiApprovals(accessRequests)} tone="green" />
            </div>
          </div>

          <div className="grid gap-4">
            {accessRequests.length === 0 ? (
              <div className="rounded-md border border-neutral-800 bg-neutral-950/30 p-5">
                <p className="text-sm font-medium text-neutral-200">No access requests yet.</p>
                <p className="mt-2 text-sm leading-6 text-neutral-500">
                  New submissions from the Hermes request form will appear here with an AI review and approval actions.
                </p>
              </div>
            ) : (
              accessRequests.map((request) => {
                const decisionRecorded = request.status === 'approved' || request.status === 'declined';

                return (
                  <article
                    key={request.id}
                    className="grid gap-5 rounded-md border border-neutral-800 bg-neutral-950/30 p-5 xl:grid-cols-[0.8fr_1.15fr_0.55fr]"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${getAccessStatusClass(request.status)}`}>
                          {formatConstant(request.status)}
                        </span>
                        <span className="text-xs text-neutral-500">{formatDate(request.createdAt)}</span>
                      </div>
                      <h3 className="mt-4 text-xl font-semibold text-neutral-50">
                        {request.firstName} {request.lastName}
                      </h3>
                      <dl className="mt-4 grid gap-3 text-sm">
                        <div>
                          <dt className="text-neutral-500">Email</dt>
                          <dd className="mt-1 text-neutral-200">{request.email}</dd>
                        </div>
                        <div>
                          <dt className="text-neutral-500">Profile</dt>
                          <dd className="mt-1 text-neutral-200">
                            {[request.role, request.organization, request.country].filter(Boolean).join(' · ')}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-neutral-500">Capital</dt>
                          <dd className="mt-1 text-neutral-200">
                            {[request.capitalRange, request.objective].filter(Boolean).join(' · ')}
                          </dd>
                        </div>
                      </dl>
                    </div>

                    <div className="grid gap-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${getRecommendationClass(request.aiReview.recommendation)}`}>
                          AI {formatConstant(request.aiReview.recommendation)}
                        </span>
                        <span className="rounded-full border border-neutral-700 px-2.5 py-0.5 text-xs text-neutral-400">
                          {formatConstant(request.aiReview.confidence)} confidence
                        </span>
                        <span className="rounded-full border border-neutral-700 px-2.5 py-0.5 text-xs text-neutral-400">
                          {request.aiReview.source === 'openai' ? request.aiReview.model : 'Rules fallback'}
                        </span>
                      </div>

                      <p className="text-sm leading-6 text-neutral-300">{request.context || 'No additional context provided.'}</p>

                      <div className="grid gap-3 md:grid-cols-3">
                        <div>
                          <span className="text-xs uppercase tracking-[0.14em] text-neutral-500">Reasons</span>
                          <ul className="mt-2 grid gap-2 text-sm leading-5 text-neutral-300">
                            {request.aiReview.reasons.map((reason) => (
                              <li key={reason}>{reason}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <span className="text-xs uppercase tracking-[0.14em] text-neutral-500">Missing</span>
                          <ul className="mt-2 grid gap-2 text-sm leading-5 text-neutral-300">
                            {(request.aiReview.missingInfo.length ? request.aiReview.missingInfo : ['None']).map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <span className="text-xs uppercase tracking-[0.14em] text-neutral-500">Risk flags</span>
                          <ul className="mt-2 grid gap-2 text-sm leading-5 text-neutral-300">
                            {(request.aiReview.riskFlags.length ? request.aiReview.riskFlags : ['None']).map((flag) => (
                              <li key={flag}>{flag}</li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {getLedgerAccountId(request) ? (
                        <div className="grid gap-3 rounded-md border border-emerald-400/20 bg-emerald-400/10 px-3 py-3 text-sm text-emerald-100 sm:grid-cols-2">
                          <span>Solace user: {request.solaceUserId ?? 'Pending'}</span>
                          <span>Hermes account: {request.hermesAccountId ?? 'Pending'}</span>
                          <span>Ledger account: {getLedgerAccountId(request)}</span>
                          <span>Invite code: {request.dashboardInviteCode ?? 'Pending'}</span>
                        </div>
                      ) : null}
                    </div>

                    <div className="grid content-start gap-2">
                      {decisionRecorded ? (
                        <>
                          <div className="rounded-md border border-neutral-800 bg-[#181715] p-3 text-sm text-neutral-300">
                            Decision: {formatConstant(request.humanDecision ?? request.status)}
                          </div>
                          {request.status === 'approved' ? (
                            <>
                              <InviteRecipientForm email={request.email} requestId={request.id} />
                              <ResendApprovalEmailButton requestId={request.id} />
                            </>
                          ) : null}
                        </>
                      ) : (
                        <>
                          <AccessDecisionButton decision="APPROVED" requestId={request.id} tone="green">
                            Approve
                          </AccessDecisionButton>
                          <AccessDecisionButton decision="REQUEST_MORE_INFO" requestId={request.id} tone="neutral">
                            More info
                          </AccessDecisionButton>
                          <AccessDecisionButton decision="DECLINED" requestId={request.id} tone="red">
                            Decline
                          </AccessDecisionButton>
                        </>
                      )}
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="grid gap-5">
            <article className="rounded-lg border border-neutral-800 bg-[#181715] p-6">
              <p className="text-sm font-medium text-neutral-400">Overview</p>
              <h2 className="mt-1 text-xl font-semibold text-neutral-50">Current state</h2>
              <dl className="mt-5 grid gap-4">
                <div className="grid grid-cols-[1fr_auto] gap-4 border-t border-neutral-800 pt-4 first:border-t-0 first:pt-0">
                  <dt className="text-sm text-neutral-500">Active account</dt>
                  <dd className="text-sm font-medium text-neutral-200">{snapshot.account.label}</dd>
                </div>
                <div className="grid grid-cols-[1fr_auto] gap-4 border-t border-neutral-800 pt-4">
                  <dt className="text-sm text-neutral-500">Hermes status</dt>
                  <dd className="text-sm font-medium text-emerald-200">{snapshot.status.status}</dd>
                </div>
                <div className="grid grid-cols-[1fr_auto] gap-4 border-t border-neutral-800 pt-4">
                  <dt className="text-sm text-neutral-500">Risk profile</dt>
                  <dd className="text-sm font-medium text-neutral-200">{snapshot.status.riskProfile}</dd>
                </div>
                <div className="grid grid-cols-[1fr_auto] gap-4 border-t border-neutral-800 pt-4">
                  <dt className="text-sm text-neutral-500">Opportunity environment</dt>
                  <dd className="text-sm font-medium text-neutral-200">{snapshot.outlook.environment}</dd>
                </div>
                <div className="grid grid-cols-[1fr_auto] gap-4 border-t border-neutral-800 pt-4">
                  <dt className="text-sm text-neutral-500">Ledger source</dt>
                  <dd className="text-sm font-medium text-neutral-200">Ledger V1</dd>
                </div>
              </dl>
            </article>

            <article className="rounded-lg border border-neutral-800 bg-[#181715] p-6">
              <p className="text-sm font-medium text-neutral-400">Contracts</p>
              <h2 className="mt-1 text-xl font-semibold text-neutral-50">Dashboard contract</h2>
              <p className="mt-3 text-sm leading-6 text-neutral-400">
                The user dashboard is the first read model. Its contract maps each visible field to a future
                owner service and backend requirement.
              </p>
              <Link
                href="/dashboard/contract"
                className="mt-5 inline-flex h-10 items-center justify-center rounded-md border border-neutral-700 px-4 text-sm font-medium text-neutral-100 transition-colors hover:bg-neutral-800"
              >
                Open contract inspector
              </Link>
            </article>
          </div>

          <section className="rounded-lg border border-neutral-800 bg-[#181715] p-6" aria-labelledby="systems-heading">
            <p className="text-sm font-medium text-neutral-400">Systems</p>
            <h2 id="systems-heading" className="mt-1 text-xl font-semibold text-neutral-50">
              Owner services
            </h2>
            <div className="mt-5 grid gap-3">
              {ownerSummaries.map((owner) => {
                const state = getOwnerState(owner.fields);

                return (
                  <article
                    key={owner.ownerLabel}
                    className="grid gap-4 rounded-md border border-neutral-800 bg-neutral-950/30 p-4 md:grid-cols-[1fr_auto] md:items-start"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-sm font-semibold text-neutral-50">{owner.ownerLabel}</h3>
                        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${getOwnerStateClass(state)}`}>
                          {state}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-neutral-400">
                        Owns {owner.fields.length} dashboard {owner.fields.length === 1 ? 'field' : 'fields'}:
                        {' '}
                        {owner.fields.map((field) => field.label).join(', ')}.
                      </p>
                    </div>
                    <span className="rounded-full border border-neutral-700 px-2.5 py-0.5 text-xs text-neutral-400">
                      {owner.fields.length}
                    </span>
                  </article>
                );
              })}
            </div>
          </section>
        </section>

        <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <article className="rounded-lg border border-neutral-800 bg-[#181715] p-6">
            <p className="text-sm font-medium text-neutral-400">Ledger</p>
            <h2 className="mt-1 text-xl font-semibold text-neutral-50">Account truth</h2>
            <dl className="mt-5 grid gap-4">
              <div className="grid grid-cols-[1fr_auto] gap-4 border-t border-neutral-800 pt-4 first:border-t-0 first:pt-0">
                <dt className="text-sm text-neutral-500">User</dt>
                <dd className="text-sm font-medium text-neutral-200">{ledger.user.name}</dd>
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-4 border-t border-neutral-800 pt-4">
                <dt className="text-sm text-neutral-500">Account</dt>
                <dd className="text-sm font-medium text-neutral-200">{ledger.account.label}</dd>
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-4 border-t border-neutral-800 pt-4">
                <dt className="text-sm text-neutral-500">Available to withdraw</dt>
                <dd className="text-sm font-medium text-neutral-200">{formatCurrency(ledger.portfolio.availableToWithdraw)}</dd>
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-4 border-t border-neutral-800 pt-4">
                <dt className="text-sm text-neutral-500">Solace fee accrual</dt>
                <dd className="text-sm font-medium text-neutral-200">{formatCurrency(ledger.portfolio.accruedSolaceFees)}</dd>
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-4 border-t border-neutral-800 pt-4">
                <dt className="text-sm text-neutral-500">Today</dt>
                <dd className="text-sm font-medium text-emerald-200">
                  {formatCurrency(ledger.performance.todaysChange.amount)} ({formatPercent(ledger.performance.todaysChange.percentage)})
                </dd>
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-4 border-t border-neutral-800 pt-4">
                <dt className="text-sm text-neutral-500">Since inception</dt>
                <dd className="text-sm font-medium text-emerald-200">{formatPercent(ledger.performance.sinceInception)}</dd>
              </div>
            </dl>
          </article>

          <article className="rounded-lg border border-neutral-800 bg-[#181715] p-6">
            <p className="text-sm font-medium text-neutral-400">Treasury</p>
            <h2 className="mt-1 text-xl font-semibold text-neutral-50">KuCoin transfer state</h2>
            <div className="mt-5 grid gap-3">
              {ledger.treasuryTransfers.map((transfer) => (
                <div
                  key={transfer.id}
                  className="rounded-md border border-neutral-800 bg-neutral-950/30 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <strong className="text-sm font-semibold text-neutral-50">
                      {formatCurrency(transfer.amount)} to KuCoin
                    </strong>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                        transfer.status === 'reconciled'
                          ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
                          : 'border-amber-300/25 bg-amber-300/10 text-amber-100'
                      }`}
                    >
                      {formatConstant(transfer.status)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-neutral-400">{transfer.notes}</p>
                  <div className="mt-3 grid gap-2 text-xs text-neutral-500 sm:grid-cols-2">
                    <span>Created {formatDate(transfer.createdAt)}</span>
                    <span>Reference {transfer.externalReference ?? 'Pending'}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-md border border-neutral-800 bg-neutral-950/30 p-4">
              <div className="grid grid-cols-[1fr_auto] gap-4">
                <span className="text-sm text-neutral-500">Ledger vs KuCoin variance</span>
                <strong className="text-sm font-semibold text-emerald-200">
                  {formatCurrency(ledger.reconciliation.variance)}
                </strong>
              </div>
            </div>
          </article>
        </section>

        <section className="rounded-lg border border-neutral-800 bg-[#181715] p-6" aria-labelledby="ledger-entries-heading">
          <p className="text-sm font-medium text-neutral-400">Ledger Entries</p>
          <h2 id="ledger-entries-heading" className="mt-1 text-xl font-semibold text-neutral-50">
            Immutable account events
          </h2>
          <div className="mt-5 grid gap-3">
            {ledger.entries.map((entry) => (
              <article
                key={entry.id}
                className="grid gap-3 rounded-md border border-neutral-800 bg-neutral-950/30 p-4 lg:grid-cols-[0.75fr_0.7fr_0.7fr_1fr_auto] lg:items-center"
              >
                <div>
                  <span className="block text-xs uppercase tracking-[0.14em] text-neutral-500">Type</span>
                  <strong className="mt-1 block text-sm font-semibold text-neutral-50">{formatConstant(entry.type)}</strong>
                </div>
                <div>
                  <span className="block text-xs uppercase tracking-[0.14em] text-neutral-500">Amount</span>
                  <strong
                    className={`mt-1 block text-sm font-semibold ${
                      entry.type === 'fee' ? 'text-amber-100' : 'text-emerald-200'
                    }`}
                  >
                    {formatCurrency(entry.amount)}
                  </strong>
                </div>
                <div>
                  <span className="block text-xs uppercase tracking-[0.14em] text-neutral-500">Source</span>
                  <span className="mt-1 block text-sm text-neutral-300">{formatConstant(entry.source)}</span>
                </div>
                <div>
                  <span className="block text-xs uppercase tracking-[0.14em] text-neutral-500">Description</span>
                  <span className="mt-1 block text-sm text-neutral-300">{entry.description}</span>
                </div>
                <time className="text-sm text-neutral-500" dateTime={entry.effectiveAt}>
                  {formatDate(entry.effectiveAt)}
                </time>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
