import type { Metadata } from 'next';

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

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <ConsoleLivePanels initialData={consoleLiveData} />
      </div>
    </main>
  );
}
