import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { observatoryChainPath } from '@/features/observatory/paths';

export const metadata: Metadata = {
  title: 'Solace · Hermes Decision Chain',
  description:
    'Redirects to the unified Observatory. Hermes is the default instrument on the decision chain.',
  alternates: {
    canonical: 'https://solace.fyi/observatory?instrument=hermes',
  },
};

/** Legacy path: Hermes ledger now lives on the unified Observatory. */
export default function HermesLedgerRedirectPage() {
  redirect(observatoryChainPath('hermes'));
}
