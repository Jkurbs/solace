import type { Metadata } from 'next';

import { listAccessRequests } from '@/features/access-review/store';
import type { HermesAccessRequest } from '@/features/access-review/types';
import { hasConsoleAccess } from '@/features/solace-console/access';

import ConsoleAccessGate from '../ConsoleAccessGate';
import ConsoleHeader from '../ConsoleHeader';
import ArticleCreator from './ArticleCreator';

export const metadata: Metadata = {
  title: 'Solace — Article Creator',
  description: 'Internal Solace article drafting surface for research notes and public writing.',
};

type ArticleCreatorPageProps = {
  searchParams?: Promise<{
    access?: string | string[];
  }>;
};

function countPendingReviews(requests: HermesAccessRequest[]) {
  return requests.filter((request) => request.status === 'review' || request.status === 'new').length;
}

export default async function ArticleCreatorPage({ searchParams }: ArticleCreatorPageProps) {
  const accessGranted = await hasConsoleAccess();
  const params = await searchParams;

  if (!accessGranted) {
    const denied = Array.isArray(params?.access) ? params.access.includes('denied') : params?.access === 'denied';

    return <ConsoleAccessGate denied={denied} />;
  }

  const accessRequests = await listAccessRequests();
  const pendingAccessCount = countPendingReviews(accessRequests);

  return (
    <main className="min-h-screen bg-black text-neutral-50">
      <ConsoleHeader pendingAccessCount={pendingAccessCount} />
      <ArticleCreator />
    </main>
  );
}
