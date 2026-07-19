'use client';

import { useState } from 'react';

import type { LedgerScoreboard } from '@/features/hermes-ledger/scoreboard';
import { formatHours, formatPercent } from '@/features/hermes-ledger/scoreboard';

const pnlFormatter = new Intl.NumberFormat('en-US', {
  currency: 'USD',
  maximumFractionDigits: 2,
  signDisplay: 'exceptZero',
  style: 'currency',
});

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="trust-score-cell">
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <em>{detail}</em> : null}
    </div>
  );
}

export default function TrustScoreboard({ scoreboard }: { scoreboard: LedgerScoreboard }) {
  const [showPerformance, setShowPerformance] = useState(false);
  const { process, performance } = scoreboard;

  return (
    <div className="trust-scoreboard">
      <div className="trust-scoreboard-head">
        <div>
          <p>Process</p>
          <h3>Ledger scoreboard</h3>
        </div>
        <p className="trust-scoreboard-dek">
          Process and integrity first. Outcomes stay secondary on purpose.
        </p>
      </div>

      <div className="trust-score-grid trust-score-grid-primary" aria-label="Process metrics">
        <Metric
          label="Sealed decisions"
          value={String(process.sealedDecisions)}
          detail={process.system ? `${process.system} system row${process.system === 1 ? '' : 's'} excluded` : 'Excludes system rows'}
        />
        <Metric
          label="Pending · Resolved"
          value={`${process.pending} · ${process.resolved}`}
          detail="Open paths vs settled rows"
        />
        <Metric
          label="Standing down rate"
          value={formatPercent(process.standDownRate)}
          detail={
            process.sealedDecisions
              ? `${process.standDownCount} of ${process.sealedDecisions} stand-down / wait`
              : 'No decisions yet'
          }
        />
        <Metric
          label="Backfilled"
          value={String(process.backfilled)}
          detail={process.backfilled === 0 ? 'None labeled after the fact' : 'Labeled · not sealed-first'}
        />
      </div>

      <div className="trust-scoreboard-actions">
        <button
          type="button"
          className="trust-score-toggle"
          aria-expanded={showPerformance}
          onClick={() => setShowPerformance((open) => !open)}
        >
          {showPerformance ? 'Hide outcome metrics' : 'Show outcome metrics'}
        </button>
        <span>Optional · sealed decisions only · young sample</span>
      </div>

      {showPerformance ? (
        <div className="trust-score-grid trust-score-grid-secondary" aria-label="Outcome metrics">
          <Metric
            label="Outcomes"
            value={`${performance.positive} / ${performance.neutral} / ${performance.negative}`}
            detail="Positive · neutral · negative"
          />
          <Metric
            label="Hit rate"
            value={formatPercent(performance.hitRate)}
            detail={
              performance.sampleSize
                ? `Directional only · n=${performance.positive + performance.negative}`
                : 'No directional outcomes yet'
            }
          />
          <Metric
            label="Expectancy"
            value={performance.expectancy === null ? '—' : pnlFormatter.format(performance.expectancy)}
            detail={performance.sampleSize ? `Mean PnL · n=${performance.sampleSize}` : 'Sealed resolved only'}
          />
          <Metric
            label="Avg time to resolve"
            value={formatHours(performance.avgResolveHours)}
            detail="Open → close when paired"
          />
        </div>
      ) : null}
    </div>
  );
}
