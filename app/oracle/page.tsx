import type { Metadata } from 'next';
import Link from 'next/link';

import { calibration } from '../calibration';
import Mark from '../Mark';
import ThemeToggle from '../ThemeToggle';
import { activePredictionCount, activePredictions } from './active-predictions';
import OracleExperience from './OracleExperience';
import { resolvedQuestions } from './resolved-questions';

export const metadata: Metadata = {
  title: 'Solace · Oracle',
  description:
    'Oracle estimates the probability of real events, records each estimate before the outcome is known, and scores it against what actually happened.',
};

// Re-evaluate freshness-ish surfaces hourly instead of freezing them at build time.
export const revalidate = 3600;

export default function OraclePage() {
  return (
    <main className="oracle-shell min-h-screen text-foreground">
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
        activeCount={activePredictionCount}
        asOf={calibration.asOf}
        buckets={calibration.buckets}
        active={activePredictions}
        resolvedQuestions={resolvedQuestions}
      />
    </main>
  );
}
