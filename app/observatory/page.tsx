import type { Metadata } from 'next';
import { Suspense } from 'react';

import {
  parseObservatoryInstrument,
  type ObservatoryInstrumentId,
} from '@/features/observatory/paths';

import ObservatoryExperience from './ObservatoryExperience';
import {
  loadGloryaChainData,
  loadHermesChainData,
  loadOracleChainData,
} from './load-chain-data';

export const metadata: Metadata = {
  title: 'Solace · Observatory',
  description:
    'Inspect the decision chain. Every Solace instrument records observations, reasoning, and actions in one Observatory.',
  openGraph: {
    title: 'Solace · Observatory',
    description:
      'One place where every instrument exposes its chain of reasoning. Hermes, Oracle, Glorya.',
    url: 'https://solace.fyi/observatory',
    type: 'website',
    siteName: 'Solace',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Solace · Observatory',
    description:
      'Inspect the decision chain. Every instrument leaves an auditable path.',
  },
};

export const revalidate = 60;

type Props = {
  searchParams: Promise<{ instrument?: string | string[] }>;
};

export default async function ObservatoryPage({ searchParams }: Props) {
  const params = await searchParams;
  const initialInstrument: ObservatoryInstrumentId = parseObservatoryInstrument(
    params.instrument,
  );

  const [hermes, oracle] = await Promise.all([loadHermesChainData(), loadOracleChainData()]);
  const glorya = loadGloryaChainData();

  return (
    <Suspense
      fallback={
        <main className="hermes-paper min-h-screen">
          <div className="hermes-paper-shell" style={{ paddingTop: '6rem' }}>
            <p className="hermes-paper-kicker">Observatory</p>
            <p className="hermes-paper-lede">Loading the decision chain…</p>
          </div>
        </main>
      }
    >
      <ObservatoryExperience
        initialInstrument={initialInstrument}
        hermes={hermes}
        oracle={oracle}
        glorya={glorya}
      />
    </Suspense>
  );
}
