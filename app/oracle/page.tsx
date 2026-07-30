import type { Metadata } from 'next';
import Link from 'next/link';

import { calibration } from '../calibration';
import Mark from '../Mark';
import ThemeToggle from '../ThemeToggle';
import OracleExperience from './OracleExperience';
import { resolvedQuestions } from './resolved-questions';
import { fetchKalshiBtcEthPredictions } from '@/features/oracle/kalshi';

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
    <main className="oracle-shell hermes-paper min-h-screen text-foreground">
      <header className="oracle-shell-header">
        <div className="oracle-shell-header-inner">
          <Link href="/" className="oracle-shell-brand" aria-label="Solace home">
            <Mark size={18} className="site-mark" />
            <span>Solace</span>
          </Link>
          <div className="oracle-shell-actions">
            <ThemeToggle />
            <Link href="/hermes" className="oracle-shell-link">
              Hermes
            </Link>
            <Link href="/" className="oracle-shell-link">
              Home
            </Link>
          </div>
        </div>
      </header>

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
    </main>
  );
}
