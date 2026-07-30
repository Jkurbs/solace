'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import type { CalibrationBucket } from '../calibration';
import ReliabilityDiagram from '../ReliabilityDiagram';
import type { ActivePrediction } from './active-predictions';
import ShareBelief from './ShareBelief';
import type { ResolvedQuestion } from './resolved-questions';
import { getQuestionRead } from './resolved-questions';

import { OBSERVATORY_ORACLE_LEDGER_PATH } from '@/features/observatory/paths';

export type OracleTab = 'active' | 'resolved' | 'calibration' | 'about';

type Props = {
  resolved: number;
  brier: number;
  activeCount: number;
  asOf: string;
  buckets: CalibrationBucket[];
  active: ActivePrediction[];
  resolvedQuestions: ResolvedQuestion[];
  feedError?: string | null;
  isLive?: boolean;
};

const tabs: { id: OracleTab; label: string }[] = [
  { id: 'active', label: 'Active predictions' },
  { id: 'resolved', label: 'Resolved' },
  { id: 'calibration', label: 'Calibration' },
  { id: 'about', label: 'About' },
];

const pct = (n: number) => `${Math.round(n * 100)}%`;

function remainingLabel(iso: string, nowMs: number) {
  const end = new Date(iso).getTime();
  if (!Number.isFinite(end)) return 'Open';
  const ms = end - nowMs;
  if (ms <= 0) return 'Resolving';

  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

  if (days >= 2) return `${days} days remaining`;
  if (days === 1) return hours > 0 ? `1d ${hours}h remaining` : '1 day remaining';
  if (hours >= 1) return `${hours}h remaining`;
  return 'Hours remaining';
}

function deltaLabel(delta: number | null, window: string | null) {
  if (delta === null || !window) return null;
  const sign = delta > 0 ? '+' : '';
  const points = `${sign}${Math.round(delta * 100)}%`;
  return { points, window, tone: delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat' as const };
}

function bucketRead(predicted: number, actual: number) {
  const gap = predicted - actual;
  if (Math.abs(gap) < 0.06) return 'On line' as const;
  if (gap > 0) return 'Overconfident' as const;
  return 'Cautious' as const;
}

export default function OracleExperience({
  resolved,
  brier,
  activeCount,
  asOf,
  buckets,
  active,
  resolvedQuestions,
  feedError = null,
  isLive = false,
}: Props) {
  const [tab, setTab] = useState<OracleTab>('active');
  const nowMs = useMemo(() => Date.now(), []);
  const asOfLabel = useMemo(() => {
    const t = new Date(asOf).getTime();
    if (!Number.isFinite(t)) return asOf;
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    }).format(t);
  }, [asOf]);

  return (
    <div className="oracle-board">
      <header className="oracle-board-hero">
        <p className="oracle-board-kicker">
          {isLive ? (
            <span className="oracle-live-pill">
              <i aria-hidden="true" />
              Live · Kalshi BTC / ETH
            </span>
          ) : (
            <span className="oracle-live-pill is-quiet">Oracle · BTC / ETH</span>
          )}
        </p>
        <h1 className="oracle-board-title">Oracle</h1>
        <p className="oracle-board-dek">
          Estimates the probability of real events, records each estimate before the outcome is known,
          and scores it against what actually happened. Live board begins with Bitcoin and Ethereum.
        </p>
        <Link href={OBSERVATORY_ORACLE_LEDGER_PATH} className="oracle-board-ledger-btn">
          Check the ledger
          <span aria-hidden="true">→</span>
        </Link>
        <div className="oracle-board-stats" aria-label="Oracle scoreboard">
          <div>
            <strong>{resolved}</strong>
            <span>resolved</span>
          </div>
          <div>
            <strong>{brier.toFixed(2)}</strong>
            <span>brier score</span>
          </div>
          <div>
            <strong>{activeCount}</strong>
            <span>active</span>
          </div>
        </div>
      </header>

      <nav className="oracle-board-tabs" aria-label="Oracle sections">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`oracle-board-tab${tab === item.id ? ' is-active' : ''}`}
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {tab === 'active' ? (
        <section className="oracle-board-panel" aria-label="Active predictions">
          {active.length === 0 ? (
            <p className="oracle-board-empty">
              {feedError
                ? `Kalshi feed unavailable right now. ${feedError}`
                : 'No open Bitcoin or Ethereum markets to show yet (15-minute markets are excluded).'}
            </p>
          ) : (
            <ul className="oracle-belief-list">
              {active.map((entry) => {
                const delta = deltaLabel(entry.delta, entry.deltaWindow);
                return (
                  <li key={entry.id} id={entry.id} className="oracle-belief-card">
                    <div className="oracle-belief-main">
                      <p className="oracle-belief-kicker">
                        oracle believes
                        {entry.asset ? (
                          <span className={`oracle-belief-asset is-${entry.asset}`}>
                            {entry.asset.toUpperCase()}
                          </span>
                        ) : null}
                      </p>
                      <h2 className="oracle-belief-question">{entry.question}</h2>
                      <div className="oracle-belief-meta">
                        <span className="oracle-belief-meta-item">
                          <span className="oracle-belief-clock" aria-hidden="true">
                            ○
                          </span>
                          {remainingLabel(entry.resolvesAt, nowMs)}
                        </span>
                        <span className="oracle-belief-confidence">
                          <span aria-hidden="true">✓</span>
                          Confidence {pct(entry.confidence)}
                        </span>
                        {delta ? (
                          <span className={`oracle-belief-delta is-${delta.tone}`}>
                            {delta.tone === 'up' ? '↑' : delta.tone === 'down' ? '↓' : '·'} {delta.points}{' '}
                            {delta.window}
                          </span>
                        ) : null}
                        {entry.illustrative ? (
                          <span className="oracle-belief-illustrative" title="Illustrative sample card">
                            Illustrative
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="oracle-belief-prob">
                      <strong>{pct(entry.probability)}</strong>
                      <span>probability</span>
                    </div>
                    <div className="oracle-belief-actions">
                      <ShareBelief
                        id={entry.id}
                        question={entry.question}
                        probability={entry.probability}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="oracle-board-footnote">
            {active.length === 0
              ? 'BTC and ETH only · 15-minute markets excluded'
              : `Showing ${active.length} of ${activeCount} open BTC/ETH markets · 15-minute markets excluded`}
          </p>
        </section>
      ) : null}

      {tab === 'resolved' ? (
        <section className="oracle-board-panel" aria-label="Resolved predictions">
          {resolvedQuestions.length === 0 ? (
            <p className="oracle-board-empty">No resolved questions published yet.</p>
          ) : (
            <ul className="oracle-belief-list">
              {resolvedQuestions.map((entry) => {
                const read = getQuestionRead(entry);
                return (
                  <li key={entry.id} className="oracle-belief-card is-resolved">
                    <div className="oracle-belief-main">
                      <p className="oracle-belief-kicker">oracle believed</p>
                      <h2 className="oracle-belief-question">{entry.question}</h2>
                      <div className="oracle-belief-meta">
                        <span className="oracle-belief-confidence">
                          Resolved · {entry.outcome === 'YES' ? 'Yes' : 'No'}
                        </span>
                        <span className={`oracle-belief-read is-${read.toLowerCase().replace(/\s+/g, '-')}`}>
                          {read}
                        </span>
                        {entry.illustrative ? (
                          <span className="oracle-belief-illustrative">Illustrative</span>
                        ) : null}
                      </div>
                      <p className="oracle-belief-dates">
                        Recorded {entry.recordedAt} · Resolved {entry.resolvedAt}
                      </p>
                    </div>
                    <div className="oracle-belief-prob">
                      <strong>{pct(entry.probability)}</strong>
                      <span>said</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="oracle-board-footnote">
            {resolved} resolved on the public score · full sealed record on the ledger
          </p>
        </section>
      ) : null}

      {tab === 'calibration' ? (
        <section className="oracle-board-panel" aria-label="Calibration">
          <div className="oracle-cal-copy">
            <h2>Calibration curve</h2>
            <p>
              Each dot is a band of predictions grouped by confidence. Its position is the average
              probability we assigned versus how often those events actually resolved yes. The dashed
              line is perfect calibration.
            </p>
          </div>
          <div className="oracle-cal-chart">
            <ReliabilityDiagram size="lg" />
            <div className="oracle-cal-legend" aria-hidden="true">
              <span>
                <i className="is-on" /> On line
              </span>
              <span>
                <i className="is-over" /> Overconfident
              </span>
            </div>
          </div>
          <div className="oracle-cal-table" role="table" aria-label="Calibration by confidence band">
            <div className="oracle-cal-table-head" role="row">
              <span role="columnheader">confidence band</span>
              <span role="columnheader">predicted</span>
              <span role="columnheader">actual</span>
              <span role="columnheader">resolved</span>
              <span role="columnheader">read</span>
            </div>
            {buckets.map((b) => {
              const read = bucketRead(b.predicted, b.actual);
              return (
                <div className="oracle-cal-table-row" role="row" key={b.range}>
                  <span role="cell">{b.range}</span>
                  <span role="cell">{pct(b.predicted)}</span>
                  <span role="cell">{pct(b.actual)}</span>
                  <span role="cell">{b.count}</span>
                  <span role="cell" className={`oracle-cal-read is-${read.toLowerCase().replace(/\s+/g, '-')}`}>
                    <i /> {read}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {tab === 'about' ? (
        <section className="oracle-board-panel oracle-about" aria-label="About Oracle">
          <p className="oracle-about-lede">
            <strong>Oracle does not predict. Oracle believes.</strong> Every estimate is a probability, not a
            certainty. Every belief is recorded before the outcome is known, so the record cannot be edited
            after the fact.
          </p>
          <ul className="oracle-about-list">
            <li>
              <h3>Transparent by default</h3>
              <p>
                The full record is public, wins and misses alike. A record you can check is worth more than a
                number you have to trust.
              </p>
            </li>
            <li>
              <h3>Calibrated over time</h3>
              <p>
                A stated 70% should come true 70% of the time. We track our calibration curve and Brier score
                openly. The goal is not to be right every time, but to be right at the rate we claim.
              </p>
            </li>
            <li>
              <h3>Shareable beliefs</h3>
              <p>
                When you share Oracle, you are not sharing your opinion. You are citing a source. That is
                psychologically different, and it spreads differently.
              </p>
            </li>
            <li>
              <h3>Resolution as ritual</h3>
              <p>
                Every prediction is a story with a beginning, middle, and end. The countdown creates natural
                re-engagement. The resolution creates public memory. Over time, people stop paying attention
                to individual calls and start paying attention to the track record.
              </p>
            </li>
          </ul>
          <p className="oracle-board-footnote">
            Source: live Kalshi event markets (BTC / ETH) · Updated {asOfLabel} · No performance claims
          </p>
        </section>
      ) : null}

      <p className="oracle-board-source">
        {isLive ? 'Live' : 'Board'} · Kalshi BTC / ETH · Updated {asOfLabel}
        {feedError ? ` · ${feedError}` : ''} · No performance claims
      </p>
    </div>
  );
}
