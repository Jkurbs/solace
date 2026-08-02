import type { Metadata } from 'next';

import SiteFooter from '@/components/site-footer';
import SiteHeader from '@/components/site-header';
import { fetchKalshiBtcEthPredictions } from '@/features/oracle/kalshi';

import { calibration } from '../calibration';
import OracleExperience from './OracleExperience';
import { resolvedQuestions } from './resolved-questions';

export const metadata: Metadata = {
  title: 'Solace · Oracle',
  description:
    'Oracle estimates the probability of real events, records each estimate before the outcome is known, and scores it against what actually happened. Live BTC and ETH markets from Kalshi.',
};

// Near-live Kalshi board.
export const revalidate = 60;

export default async function OraclePage() {
  const feed = await fetchKalshiBtcEthPredictions(12).catch((error: unknown) => ({
    active: [] as Awaited<ReturnType<typeof fetchKalshiBtcEthPredictions>>['active'],
    activeCount: 0,
    asOf: new Date().toISOString(),
    error: error instanceof Error ? error.message : 'Kalshi feed failed',
  }));

  const isLive = feed.active.length > 0 && !feed.error;

  return (
    <main className="oracle-shell hermes-paper min-h-screen pt-16 text-foreground">
      <SiteHeader variant="ink" />

      <OracleExperience
        resolved={calibration.resolved}
        brier={calibration.brier}
        activeCount={feed.activeCount || feed.active.length}
        asOf={feed.asOf}
        buckets={calibration.buckets}
        active={feed.active}
        resolvedQuestions={resolvedQuestions}
        feedError={feed.error}
        isLive={isLive}
      />

      <SiteFooter variant="ink" />
    </main>
  );
}
