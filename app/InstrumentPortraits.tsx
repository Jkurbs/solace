'use client';

import Link from 'next/link';

import { gloryaEvaluatedNeeds } from '@/features/glorya/evaluated-needs';

import { calibration } from './calibration';
import GloryaNeedField from './GloryaNeedField';

export type HomeInstrumentPortraitsProps = {
  hermes: {
    posture: string | null;
    pathsCount: number | null;
    sealedDecisions: number | null;
    standDownRate: string | null;
    openPaths: number | null;
    openPnl: number | null;
  };
  glorya: {
    evaluated: number;
    standingDown: number;
    standDownRate: number;
  };
  /** Oracle active count when the live feed is available; falls back to calibration only. */
  oracleActiveCount?: number | null;
};

const pnlFormatter = new Intl.NumberFormat('en-US', {
  currency: 'USD',
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  signDisplay: 'always',
  style: 'currency',
});

function formatPosture(posture: string | null) {
  if (!posture) return '—';
  return posture
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/**
 * Homepage instrument identity portraits (device cards).
 * Hermes / Oracle: product phone metrics. Glorya: the need-field globe deciding.
 */
export default function InstrumentPortraits({
  hermes,
  glorya,
  oracleActiveCount = null,
}: HomeInstrumentPortraitsProps) {
  const liveHasExposure = hermes.openPnl !== null && (hermes.openPaths ?? 0) > 0;
  const openLabel =
    hermes.openPaths === null
      ? hermes.pathsCount === null
        ? '—'
        : hermes.pathsCount === 1
          ? '1 watched'
          : `${hermes.pathsCount} watched`
      : hermes.openPaths === 1
        ? '1 open'
        : `${hermes.openPaths} open`;

  return (
    <div className="obs-portraits home-portraits" aria-label="Solace instruments">
      <Link href="/hermes" className="obs-portrait is-link">
        <div className="obs-portrait-device is-hermes">
          <div className="obs-portrait-bezel">
            <div className="obs-portrait-screen">
              <div className="obs-portrait-bar">
                <span>Solace</span>
                <em>Live</em>
              </div>
              <div className="obs-portrait-body">
                <span className="obs-portrait-label">
                  {liveHasExposure ? 'Live open exposure' : 'Hermes · founder capital'}
                </span>
                <strong className="obs-portrait-value">
                  {liveHasExposure && hermes.openPnl !== null
                    ? pnlFormatter.format(hermes.openPnl)
                    : hermes.sealedDecisions !== null
                      ? hermes.sealedDecisions.toLocaleString('en-US')
                      : '—'}
                </strong>
                <span
                  className={`obs-portrait-delta${
                    liveHasExposure && hermes.openPnl !== null
                      ? hermes.openPnl > 0
                        ? ' is-pos'
                        : hermes.openPnl < 0
                          ? ' is-neg'
                          : ''
                      : ''
                  }`}
                >
                  {liveHasExposure && hermes.openPnl !== null
                    ? 'Unrealized · not a sealed row'
                    : hermes.sealedDecisions !== null
                      ? 'Sealed decisions on chain'
                      : 'Capital that decides for itself'}
                </span>
                <div className="obs-portrait-rows">
                  <div>
                    <span>Posture</span>
                    <strong>{formatPosture(hermes.posture)}</strong>
                  </div>
                  <div>
                    <span>Positions</span>
                    <strong>{openLabel}</strong>
                  </div>
                  <div>
                    <span>Standing down</span>
                    <strong>{hermes.standDownRate ?? '—'}</strong>
                  </div>
                </div>
                <div className="obs-portrait-cta">Meet Hermes</div>
              </div>
            </div>
          </div>
        </div>
        <span className="obs-portrait-caption">
          <strong>Hermes</strong>
          <em>Capital allocation · Live</em>
        </span>
      </Link>

      <Link href="/oracle" className="obs-portrait is-link">
        <div className="obs-portrait-device is-oracle">
          <div className="obs-portrait-bezel">
            <div className="obs-portrait-screen">
              <div className="obs-portrait-bar">
                <span>Solace</span>
                <em>Live</em>
              </div>
              <div className="obs-portrait-body">
                <span className="obs-portrait-label">Oracle · calibration</span>
                <strong className="obs-portrait-value">{calibration.brier.toFixed(2)}</strong>
                <span className="obs-portrait-delta">Brier score · lower is better</span>
                <div className="obs-portrait-rows">
                  <div>
                    <span>Resolved</span>
                    <strong>{calibration.resolved}</strong>
                  </div>
                  <div>
                    <span>Active</span>
                    <strong>{oracleActiveCount ?? '—'}</strong>
                  </div>
                  <div>
                    <span>Domain</span>
                    <strong>BTC / ETH</strong>
                  </div>
                </div>
                <div className="obs-portrait-cta">Open Oracle</div>
              </div>
            </div>
          </div>
        </div>
        <span className="obs-portrait-caption">
          <strong>Oracle</strong>
          <em>Belief under uncertainty · Live</em>
        </span>
      </Link>

      <Link href="/glorya" className="obs-portrait is-link" aria-label="Glorya — open instrument">
        <div className="obs-portrait-device is-glorya is-globe">
          <div className="obs-portrait-bezel">
            <div className="obs-portrait-screen is-globe-screen">
              <div className="obs-portrait-bar">
                <span>Solace</span>
                <em>Evaluating</em>
              </div>
              <div className="obs-portrait-globe" aria-hidden="true">
                <GloryaNeedField
                  needs={gloryaEvaluatedNeeds}
                  compact
                  className="obs-glorya-globe"
                />
              </div>
              <div className="obs-portrait-globe-meta">
                <span className="obs-portrait-globe-stat">
                  <strong>{Math.round(glorya.standDownRate * 100)}%</strong>
                  standing down
                </span>
                <span className="obs-portrait-globe-stat is-quiet">
                  {glorya.evaluated} evaluated · 0 sealed
                </span>
              </div>
              <div className="obs-portrait-cta">Open Glorya</div>
            </div>
          </div>
        </div>
        <span className="obs-portrait-caption">
          <strong>Glorya</strong>
          <em>Humanitarian capital · Evaluating</em>
        </span>
      </Link>
    </div>
  );
}
