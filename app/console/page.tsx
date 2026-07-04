import type { Metadata } from 'next';
import Link from 'next/link';
import { Bug, FileText, MessageSquareText, ShieldCheck } from 'lucide-react';

import { listAccessRequests } from '@/features/access-review/store';
import type { HermesAccessRequest } from '@/features/access-review/types';
import { listBugReports } from '@/features/bugops/store';
import { getLiveLedgerOverview } from '@/features/ledger/live-overview';
import { listMoneyMovementRecords } from '@/features/ledger/money-movement';
import { listPoolMarkingRecords } from '@/features/ledger/pool-marking';
import { listSocialObservatoryRecords } from '@/features/social-observatory/store';
import { hasConsoleAccess } from '@/features/solace-console/access';

import ConsoleAccessGate from './ConsoleAccessGate';
import ConsoleHeader from './ConsoleHeader';
import ConsoleLivePanels from './ConsoleLivePanels';

export const metadata: Metadata = {
  title: 'Solace — Console',
  description: 'Internal Solace operator console for money movement, ledger health, and treasury status.',
};

type ConsolePageProps = {
  searchParams?: Promise<{
    access?: string | string[];
  }>;
};

function countPendingReviews(requests: HermesAccessRequest[]) {
  return requests.filter((request) => request.status === 'review' || request.status === 'new').length;
}

const operatorLanes = [
  {
    description: 'Draft research notes, preview article layouts, and export clean Markdown or JSON.',
    href: '/console/articles',
    icon: FileText,
    label: 'Article Creator',
  },
  {
    description: 'Safe-to-paste drafts, disclosure classes, redaction blocks, and approval-gated social copy.',
    href: '/console/social-observatory',
    icon: MessageSquareText,
    label: 'Social Observatory',
  },
  {
    description: 'Issue intake, severity, reproduction status, and release verification.',
    href: '/console/bugops',
    icon: Bug,
    label: 'BugOps',
  },
  {
    description: 'Access requests, approval state, invites, and account activation.',
    href: '/console/access',
    icon: ShieldCheck,
    label: 'Approvals',
  },
];

export default async function ConsolePage({ searchParams }: ConsolePageProps) {
  const accessGranted = await hasConsoleAccess();
  const params = await searchParams;

  if (!accessGranted) {
    const denied = Array.isArray(params?.access) ? params.access.includes('denied') : params?.access === 'denied';

    return <ConsoleAccessGate denied={denied} />;
  }

  const [moneyMovement, poolMarking] = await Promise.all([listMoneyMovementRecords(), listPoolMarkingRecords()]);
  const consoleLiveData = {
    generatedAt: new Date().toISOString(),
    ledgerOverview: getLiveLedgerOverview(moneyMovement),
    moneyMovement,
    poolMarking,
  };
  const [accessRequests, bugReports, socialRecords] = await Promise.all([
    listAccessRequests(),
    listBugReports().catch(() => []),
    listSocialObservatoryRecords().catch(() => null),
  ]);
  const pendingAccessCount = countPendingReviews(accessRequests);
  const pendingBugCount = bugReports.filter((report) => report.status === 'NEW' || report.status === 'NEEDS_INFO').length;
  const pendingDraftCount =
    socialRecords?.drafts.filter((draft) => draft.status === 'NEEDS_REVIEW' || draft.status === 'PUBLISH_REQUESTED')
      .length ?? 0;

  const queue = [
    { count: pendingAccessCount, href: '/console/access', label: 'Access requests' },
    { count: pendingBugCount, href: '/console/bugops', label: 'Bugs to triage' },
    { count: pendingDraftCount, href: '/console/social-observatory', label: 'Drafts to review' },
  ];

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-neutral-50">
      <ConsoleHeader pendingAccessCount={pendingAccessCount} />

      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        <section className="grid gap-3 sm:grid-cols-3" aria-label="Pending work">
          {queue.map((lane) => (
            <Link
              key={lane.href}
              href={lane.href}
              className={`rounded-lg border p-4 transition-colors ${
                lane.count > 0
                  ? 'border-amber-400/40 bg-amber-400/5 hover:border-amber-400/70'
                  : 'border-neutral-800 bg-[#0d0d0b] hover:border-neutral-600'
              }`}
            >
              <span className="block font-mono text-[0.62rem] uppercase tracking-[0.16em] text-neutral-500">
                {lane.label}
              </span>
              <strong
                className={`mt-1.5 block text-2xl font-semibold tabular-nums ${
                  lane.count > 0 ? 'text-amber-300' : 'text-neutral-50'
                }`}
              >
                {lane.count}
              </strong>
            </Link>
          ))}
        </section>

        <section className="grid gap-3 md:grid-cols-3">
          {operatorLanes.map((lane) => {
            const Icon = lane.icon;

            return (
              <Link
                key={lane.href}
                href={lane.href}
                className="group rounded-lg border border-neutral-800 bg-[#0d0d0b] p-4 transition-colors hover:border-neutral-600 hover:bg-[#1f1d1a]"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-neutral-700 bg-neutral-950/40 text-neutral-300 group-hover:text-neutral-50">
                    <Icon size={18} aria-hidden="true" />
                  </span>
                  <strong className="text-sm font-semibold text-neutral-50">{lane.label}</strong>
                </div>
                <p className="mt-3 text-sm leading-6 text-neutral-500">{lane.description}</p>
              </Link>
            );
          })}
        </section>

        <ConsoleLivePanels initialData={consoleLiveData} />
      </div>
    </main>
  );
}
