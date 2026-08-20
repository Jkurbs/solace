import type { Metadata } from 'next';

import SiteFooter from '@/components/site-footer';
import SiteHeader from '@/components/site-header';
import { fetchKalshiBtcEthPredictions } from '@/features/oracle/kalshi';

import { calibration } from '../calibration';
import OracleExperience from './OracleExperience';
import { withIllustrativeOracleFallback } from './active-predictions';
import { resolvedQuestions } from './resolved-questions';

export const metadata: Metadata = {
  title: 'Solace · Oracle',
  description:
    'Oracle estimates the probability of real events, records each estimate before the outcome is known, and scores it against what actually happened. Live BTC and ETH markets from Kalshi.',
};

const ORACLE_FETCH_BUDGET_MS = 8_000;

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(fallback);
      }
    }, ms);

    promise
      .then((value) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(value);
        }
      })
      .catch(() => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(fallback);
        }
      });
  });
}

// Near-live Kalshi board. ISR, not a build-time fan-out.
export const revalidate = 60;

export default async function OraclePage() {
  const emptyFeed = {
    active: [] as Awaited<ReturnType<typeof fetchKalshiBtcEthPredictions>>['active'],
    activeCount: 0,
    asOf: new Date().toISOString(),
    error: null as string | null,
  };

  const feed = await withTimeout(
    fetchKalshiBtcEthPredictions(12).catch((error: unknown) => ({
      ...emptyFeed,
      error: error instanceof Error ? error.message : 'Kalshi feed failed',
    })),
    ORACLE_FETCH_BUDGET_MS,
    { ...emptyFeed, error: 'Kalshi feed timed out' },
  );

  const isLive = feed.active.length > 0 && !feed.error;
  const active = withIllustrativeOracleFallback(feed.active);

  return (
    <main className="oracle-shell hermes-paper min-h-screen pt-16 text-foreground">
      <SiteHeader />

      <OracleExperience
        resolved={calibration.resolved}
        brier={calibration.brier}
        activeCount={feed.activeCount || feed.active.length}
        asOf={feed.asOf}
        buckets={calibration.buckets}
        active={active}
        resolvedQuestions={resolvedQuestions}
        feedError={feed.error}
        isLive={isLive}
      />

      <SiteFooter />
    </main>
  );
}
