import type { Metadata } from 'next';
import Link from 'next/link';

import Mark from '@/app/Mark';
import { getStoredRiskProfile } from '@/features/hermes-dashboard/preferences';
import { getHermesDashboardSnapshot } from '@/features/hermes-dashboard/read-model';
import type { DashboardFieldSource, DashboardFieldSourceStatus } from '@/features/hermes-dashboard/types';
import { hasConsoleAccess } from '@/features/solace-console/access';

import ConsoleAccessGate from './ConsoleAccessGate';

export const metadata: Metadata = {
  title: 'Solace — Console',
  description: 'Internal Solace operator console for contracts, systems, and dashboard source state.',
};

type ConsolePageProps = {
  searchParams?: Promise<{
    access?: string | string[];
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

function formatDate(value: string) {
  return dateFormatter.format(new Date(value));
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

  if (!accessGranted) {
    const params = await searchParams;
    const denied = Array.isArray(params?.access) ? params.access.includes('denied') : params?.access === 'denied';

    return <ConsoleAccessGate denied={denied} />;
  }

  const riskProfile = await getStoredRiskProfile();
  const snapshot = await getHermesDashboardSnapshot({ riskProfile });
  const statusCounts = countStatuses(snapshot.fieldSources);
  const ownerSummaries = groupByOwner(snapshot.fieldSources);

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
            <Link href="/dashboard/contract" className="transition-colors hover:text-neutral-50">
              Contracts
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
      </div>
    </main>
  );
}
