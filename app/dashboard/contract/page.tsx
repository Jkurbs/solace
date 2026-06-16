import type { Metadata } from 'next';
import Link from 'next/link';

import Mark from '@/app/Mark';
import DashboardAccessGate from '@/app/dashboard/DashboardAccessGate';
import { hasDashboardAccess } from '@/features/hermes-dashboard/access';
import { getStoredRiskProfile } from '@/features/hermes-dashboard/preferences';
import { getHermesDashboardSnapshot } from '@/features/hermes-dashboard/read-model';
import { hasConsoleAccess } from '@/features/solace-console/access';
import type {
  DashboardFieldKey,
  DashboardFieldSource,
  DashboardFieldSourceStatus,
  HermesDashboardSnapshot,
} from '@/features/hermes-dashboard/types';

export const metadata: Metadata = {
  title: 'Solace — Hermes Contract Inspector',
  description: 'Internal Hermes dashboard contract inspector for field ownership and backend requirements.',
};

const currencyFormatter = new Intl.NumberFormat('en-US', {
  currency: 'USD',
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  style: 'currency',
});

const numberFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 2,
});

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

function formatCurrency(value: number, signed = false) {
  const sign = signed && value > 0 ? '+' : value < 0 ? '-' : '';

  return `${sign}${currencyFormatter.format(Math.abs(value))}`;
}

function formatPercent(value: number, signed = false) {
  const sign = signed && value > 0 ? '+' : value < 0 ? '-' : '';

  return `${sign}${numberFormatter.format(Math.abs(value))}%`;
}

function formatConstantLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function formatDate(value: string) {
  return dateFormatter.format(new Date(value));
}

function getCurrentValue(field: DashboardFieldKey, snapshot: HermesDashboardSnapshot) {
  switch (field) {
    case 'account':
      return snapshot.account.label;
    case 'portfolio':
      return formatCurrency(snapshot.portfolio.value);
    case 'todays_change':
      return `${formatCurrency(snapshot.portfolio.todaysChange.amount, true)} (${formatPercent(
        snapshot.portfolio.todaysChange.percentage,
        true,
      )})`;
    case 'since_inception':
      return formatPercent(snapshot.portfolio.sinceInception, true);
    case 'available_to_withdraw':
      return formatCurrency(snapshot.portfolio.availableToWithdraw);
    case 'status':
      return snapshot.status.status;
    case 'risk_profile':
      return snapshot.status.riskProfile;
    case 'capital_deployed':
      return formatPercent(snapshot.status.deployedCapital);
    case 'conviction':
      return formatConstantLabel(snapshot.status.conviction);
    case 'outlook':
      return `${snapshot.outlook.environment} · ${snapshot.outlook.stance}`;
    case 'allocation':
      return snapshot.allocation.map((item) => `${item.asset} ${formatPercent(item.percentage)}`).join(' · ');
    case 'activity': {
      const latest = snapshot.activity[0];

      return latest ? `${formatDate(latest.timestamp)} · ${latest.summary}` : 'No activity';
    }
    case 'commentary':
      return snapshot.commentary;
  }
}

function getStatusClass(status: DashboardFieldSourceStatus) {
  if (status === 'live') {
    return 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200';
  }

  if (status === 'planned') {
    return 'border-sky-400/30 bg-sky-400/10 text-sky-200';
  }

  return 'border-amber-300/25 bg-amber-300/10 text-amber-100';
}

function countByOwner(fieldSources: DashboardFieldSource[]) {
  return fieldSources.reduce<Array<{ ownerLabel: string; count: number }>>((owners, source) => {
    const existing = owners.find((owner) => owner.ownerLabel === source.ownerLabel);

    if (existing) {
      existing.count += 1;
      return owners;
    }

    return [...owners, { ownerLabel: source.ownerLabel, count: 1 }];
  }, []);
}

export default async function DashboardContractPage() {
  const accessGranted = (await hasDashboardAccess()) || (await hasConsoleAccess());

  if (!accessGranted) {
    return <DashboardAccessGate />;
  }

  const riskProfile = await getStoredRiskProfile();
  const snapshot = await getHermesDashboardSnapshot({ riskProfile });
  const ownerCounts = countByOwner(snapshot.fieldSources);
  const statusCounts = snapshot.fieldSources.reduce<Record<DashboardFieldSourceStatus, number>>(
    (counts, source) => ({
      ...counts,
      [source.status]: counts[source.status] + 1,
    }),
    { live: 0, mock: 0, planned: 0 },
  );

  return (
    <main className="min-h-screen bg-[#10100e] text-neutral-50">
      <header className="sticky top-0 z-30 border-b border-neutral-800 bg-[#10100e]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-50">
            <Mark size={22} />
            Solace
          </Link>
          <nav className="flex items-center gap-4 text-sm text-neutral-400">
            <Link href="/dashboard" className="transition-colors hover:text-neutral-50">
              Dashboard
            </Link>
            <Link href="/hermes" className="hidden transition-colors hover:text-neutral-50 sm:inline">
              Hermes
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <section className="grid gap-6 rounded-lg border border-neutral-800 bg-[#181715] p-6 sm:p-8">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-sm font-medium text-neutral-400">Internal</p>
              <h1 className="mt-2 text-4xl font-semibold tracking-normal text-neutral-50 sm:text-5xl">
                Contract Inspector
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-neutral-400">
                The dashboard is the read model. Each row below identifies the value being shown, the service
                that should own it, and the backend truth required before the field can move from mock to live.
              </p>
            </div>
            <div className="grid gap-2 text-sm text-neutral-400 lg:text-right">
              <span>{snapshot.contractVersion}</span>
              <span>Generated {formatDate(snapshot.generatedAt)}</span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border border-neutral-800 bg-neutral-950/40 p-4">
              <span className="text-sm text-neutral-500">Fields</span>
              <strong className="mt-1 block text-2xl font-semibold text-neutral-50">
                {snapshot.fieldSources.length}
              </strong>
            </div>
            <div className="rounded-md border border-neutral-800 bg-neutral-950/40 p-4">
              <span className="text-sm text-neutral-500">Mock</span>
              <strong className="mt-1 block text-2xl font-semibold text-amber-100">{statusCounts.mock}</strong>
            </div>
            <div className="rounded-md border border-neutral-800 bg-neutral-950/40 p-4">
              <span className="text-sm text-neutral-500">Live</span>
              <strong className="mt-1 block text-2xl font-semibold text-emerald-200">{statusCounts.live}</strong>
            </div>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[18rem_1fr]">
          <aside className="grid content-start gap-3 rounded-lg border border-neutral-800 bg-[#181715] p-5">
            <div>
              <p className="text-sm font-medium text-neutral-400">Owner Services</p>
              <h2 className="mt-1 text-base font-semibold text-neutral-50">Backend map</h2>
            </div>
            <div className="grid gap-2">
              {ownerCounts.map((owner) => (
                <div
                  key={owner.ownerLabel}
                  className="grid grid-cols-[1fr_auto] items-center gap-3 border-t border-neutral-800 py-3 first:border-t-0 first:pt-0"
                >
                  <span className="text-sm text-neutral-300">{owner.ownerLabel}</span>
                  <span className="rounded-full border border-neutral-700 px-2 py-0.5 text-xs text-neutral-400">
                    {owner.count}
                  </span>
                </div>
              ))}
            </div>
          </aside>

          <section className="grid gap-3" aria-label="Dashboard contract fields">
            <div className="hidden grid-cols-[0.9fr_1fr_0.75fr_0.45fr_1.35fr] gap-4 px-4 text-xs font-medium uppercase tracking-[0.14em] text-neutral-500 lg:grid">
              <span>Dashboard Field</span>
              <span>Current Value</span>
              <span>Owner Service</span>
              <span>Status</span>
              <span>Backend Requirement</span>
            </div>

            {snapshot.fieldSources.map((source) => (
              <article
                key={source.field}
                className="grid gap-4 rounded-lg border border-neutral-800 bg-[#181715] p-4 lg:grid-cols-[0.9fr_1fr_0.75fr_0.45fr_1.35fr] lg:items-start"
              >
                <div>
                  <span className="block text-xs font-medium uppercase tracking-[0.14em] text-neutral-500 lg:hidden">
                    Dashboard Field
                  </span>
                  <strong className="mt-1 block text-sm font-semibold text-neutral-50 lg:mt-0">{source.label}</strong>
                  <span className="mt-1 block font-mono text-xs text-neutral-500">{source.field}</span>
                </div>

                <div>
                  <span className="block text-xs font-medium uppercase tracking-[0.14em] text-neutral-500 lg:hidden">
                    Current Value
                  </span>
                  <p className="mt-1 line-clamp-3 text-sm leading-6 text-neutral-300 lg:mt-0">
                    {getCurrentValue(source.field, snapshot)}
                  </p>
                </div>

                <div>
                  <span className="block text-xs font-medium uppercase tracking-[0.14em] text-neutral-500 lg:hidden">
                    Owner Service
                  </span>
                  <p className="mt-1 text-sm text-neutral-300 lg:mt-0">{source.ownerLabel}</p>
                </div>

                <div>
                  <span className="block text-xs font-medium uppercase tracking-[0.14em] text-neutral-500 lg:hidden">
                    Status
                  </span>
                  <span
                    className={`mt-1 inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium uppercase tracking-[0.08em] lg:mt-0 ${getStatusClass(
                      source.status,
                    )}`}
                  >
                    {source.status}
                  </span>
                </div>

                <div>
                  <span className="block text-xs font-medium uppercase tracking-[0.14em] text-neutral-500 lg:hidden">
                    Backend Requirement
                  </span>
                  <p className="mt-1 text-sm leading-6 text-neutral-400 lg:mt-0">{source.requirement}</p>
                </div>
              </article>
            ))}
          </section>
        </section>
      </div>
    </main>
  );
}
