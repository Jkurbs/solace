import { Suspense } from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { parseObservatoryInstrument } from '@/features/observatory/paths';

import { getHermesOpenExposure } from '@/features/hermes-ledger/open-exposure';

import HeldPanel from './HeldPanel';
import ObservatoryExperience from './ObservatoryExperience';
import RecordTable from './RecordTable';
import { loadHermesChrome, loadHermesTableRows } from './load-chain-data';

export const metadata: Metadata = {
  title: 'Solace · Public record',
  description:
    'Every decision is written down before anyone knows if it was right. You can check the chain. Founder capital. Young sample.',
  openGraph: {
    title: 'Solace · Public record',
    description:
      'Every decision is written down before anyone knows if it was right. You can check the chain. Founder capital. Young sample.',
    url: 'https://solace.fyi/observatory',
    type: 'website',
    siteName: 'Solace',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Solace · Public record',
    description:
      'Every decision is written down before anyone knows if it was right. You can check the chain.',
  },
};

export const revalidate = 60;

type Props = {
  searchParams: Promise<{ instrument?: string | string[] }>;
};

export default async function ObservatoryPage({ searchParams }: Props) {
  const params = await searchParams;
  const instrument = parseObservatoryInstrument(params.instrument);

  if (instrument === 'oracle') {
    redirect('/oracle');
  }
  if (instrument === 'glorya') {
    redirect('/glorya');
  }

  const chrome = await loadHermesChrome();

  return (
    <ObservatoryExperience chrome={chrome}>
      <section className="record-section border-t border-border pb-12 md:px-5 md:pb-16" aria-label="Sealed rows">
        <div className="mx-auto max-w-6xl">
          <Suspense fallback={null}>
            <ObservatoryHeld chrome={chrome} />
          </Suspense>
          <Suspense fallback={<p className="px-5 py-8 text-sm text-muted">Loading sealed rows…</p>}>
            <ObservatoryTable chrome={chrome} />
          </Suspense>
          <p className="record-section-note mt-8 max-w-xl text-sm leading-relaxed text-muted">
            Founder capital only. Young sample: a record, not a claim. Not an offer, not investment
            advice.
          </p>
        </div>
      </section>
    </ObservatoryExperience>
  );
}

async function ObservatoryHeld({
  chrome,
}: {
  chrome: Awaited<ReturnType<typeof loadHermesChrome>>;
}) {
  const exposure = await getHermesOpenExposure().catch(() => null);

  return (
    <HeldPanel
      exposure={exposure}
      hermesVersion={chrome.hermesVersion}
      livePosture={chrome.livePosture}
    />
  );
}

async function ObservatoryTable({
  chrome,
}: {
  chrome: Awaited<ReturnType<typeof loadHermesChrome>>;
}) {
  const rows = await loadHermesTableRows(chrome.sealedDecisions);
  return <RecordTable rows={rows} totalSealed={chrome.sealedDecisions} />;
}
