import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { observatoryChainPath } from '@/features/observatory/paths';

export const metadata: Metadata = {
  title: 'Solace · Oracle Decision Chain',
  description: 'Redirects to the unified Observatory with Oracle selected.',
  alternates: {
    canonical: 'https://solace.fyi/observatory?instrument=oracle',
  },
};

/** Legacy path: Oracle chain lives on the unified Observatory. */
export default function OracleLedgerRedirectPage() {
  redirect(observatoryChainPath('oracle'));
}
