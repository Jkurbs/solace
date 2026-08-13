import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { parseObservatoryInstrument } from '@/features/observatory/paths';

import ObservatoryExperience from './ObservatoryExperience';
import { loadHermesChainData } from './load-chain-data';

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

  const hermes = await loadHermesChainData();

  return <ObservatoryExperience hermes={hermes} />;
}
