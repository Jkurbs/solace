import type { Metadata } from 'next';

import HermesExperience from './HermesExperience';

export const metadata: Metadata = {
  title: 'Solace — Hermes · Capital Allocation',
  description:
    'A live instrument for capital allocation under uncertainty. Hermes reads liquidity, timing, and regime — standing down until signal earns deployment. No performance claims.',
  openGraph: {
    title: 'Hermes — the first instrument',
    description:
      'A live instrument for capital allocation under uncertainty. Standing down until signal earns deployment. No performance claims.',
  },
};

export default function HermesPage() {
  return <HermesExperience />;
}
