import type { Metadata } from 'next';

import { getAnchorChain } from '@/features/anchor/store';

import AnchorClient from './AnchorClient';

export const metadata: Metadata = {
  title: 'Solace · Anchor · Verify the chain',
  description:
    'The Solace decision chain is cryptographically anchored every day. Paste any chain head hash to verify when it was anchored and check continuity.',
  openGraph: {
    title: 'Solace · Anchor · Verify the chain',
    description:
      'Cryptographically verify that the Solace decision chain has not been rewritten.',
    url: 'https://solace.fyi/anchor',
    type: 'website',
    siteName: 'Solace',
  },
};

export const revalidate = 60;

export default async function AnchorPage() {
  const chain = await getAnchorChain();
  return <AnchorClient chain={chain} />;
}
