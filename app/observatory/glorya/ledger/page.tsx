import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { observatoryChainPath } from '@/features/observatory/paths';

export const metadata: Metadata = {
  title: 'Solace · Glorya Decision Chain',
  description: 'Redirects to the unified Observatory with Glorya selected.',
  alternates: {
    canonical: 'https://solace.fyi/observatory?instrument=glorya',
  },
};

/** Legacy path: Glorya chain lives on the unified Observatory. */
export default function GloryaLedgerRedirectPage() {
  redirect(observatoryChainPath('glorya'));
}
