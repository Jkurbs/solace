import type { Metadata } from 'next';
import Link from 'next/link';
import { Bug, FileText, MessageSquareText, ShieldCheck } from 'lucide-react';

import { listAccessRequests } from '@/features/access-review/store';
import type { HermesAccessRequest } from '@/features/access-review/types';
import { getLiveLedgerOverview } from '@/features/ledger/live-overview';
import { listMoneyMovementRecords } from '@/features/ledger/money-movement';
import { listPoolMarkingRecords } from '@/features/ledger/pool-marking';
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
  const accessRequests = await listAccessRequests();
  const pendingAccessCount = countPendingReviews(accessRequests);

  return (
    <main className="min-h-screen bg-[#10100e] text-neutral-50">
      <ConsoleHeader pendingAccessCount={pendingAccessCount} />

      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        <section className="grid gap-3 md:grid-cols-3">
          {operatorLanes.map((lane) => {
            const Icon = lane.icon;

            return (
              <Link
                key={lane.href}
                href={lane.href}
                className="group rounded-lg border border-neutral-800 bg-[#181715] p-4 transition-colors hover:border-neutral-600 hover:bg-[#1f1d1a]"
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
