import { Suspense } from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { parseObservatoryInstrument } from '@/features/observatory/paths';

import HeldPanel from './HeldPanel';
import ObservatoryExperience from './ObservatoryExperience';
import RecordTable from './RecordTable';
import { loadHermesChrome, loadHermesSheet } from './load-chain-data';

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
      <Suspense
        fallback={
          <section className="record-section border-t border-border pb-12 md:px-5 md:pb-16" aria-label="Sealed rows">
            <div className="mx-auto max-w-6xl px-5 py-16 text-sm text-muted">Opening the sheet…</div>
          </section>
        }
      >
        <ObservatorySheet chrome={chrome} />
      </Suspense>
    </ObservatoryExperience>
  );
}

async function ObservatorySheet({
  chrome,
}: {
  chrome: Awaited<ReturnType<typeof loadHermesChrome>>;
}) {
  const sheet = await loadHermesSheet(chrome.sealedDecisions);

  return (
    <section className="record-section border-t border-border pb-12 md:px-5 md:pb-16" aria-label="Sealed rows">
      <div className="mx-auto max-w-6xl">
        <HeldPanel
          exposure={sheet.openExposure}
          hermesVersion={chrome.hermesVersion}
          livePosture={chrome.livePosture}
        />
        <RecordTable rows={sheet.rows} totalSealed={chrome.sealedDecisions} />
        <p className="record-section-note mt-8 max-w-xl text-sm leading-relaxed text-muted">
          Founder capital only. Young sample: a record, not a claim. Not an offer, not investment
          advice.
        </p>
      </div>
    </section>
  );
}
