'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

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

type LiveHermesPulse = {
  openPaths: number | null;
  openPnl: number | null;
  sealedDecisions: number | null;
};

/**
 * Homepage instrument identity portraits (device cards).
 * Hermes / Oracle: product phone metrics. Glorya: the need-field globe deciding.
 *
 * Live Hermes numbers hydrate client-side from the lightweight pulse API so the
 * homepage build never walks the full ledger or hits Kalshi.
 */
export default function InstrumentPortraits({
  hermes,
  glorya,
  oracleActiveCount = null,
}: HomeInstrumentPortraitsProps) {
  const [live, setLive] = useState<LiveHermesPulse>({
    openPaths: hermes.openPaths,
    openPnl: hermes.openPnl,
    sealedDecisions: hermes.sealedDecisions,
  });

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const load = async () => {
      try {
        const response = await fetch(`/api/hermes/ledger-pulse?ts=${Date.now()}`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok) return;
        const pulse = (await response.json()) as {
          paths?: number;
          unrealizedPnl?: number | null;
          rowCount?: number;
        };
        if (cancelled) return;
        setLive({
          openPaths: typeof pulse.paths === 'number' ? pulse.paths : null,
          openPnl: typeof pulse.unrealizedPnl === 'number' ? pulse.unrealizedPnl : null,
          sealedDecisions: typeof pulse.rowCount === 'number' ? pulse.rowCount : null,
        });
      } catch {
        // Keep SSR snapshot; never block the card on pulse failure.
      }
    };

    load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  const openPaths = live.openPaths ?? hermes.openPaths;
  const openPnl = live.openPnl ?? hermes.openPnl;
  const sealedDecisions = live.sealedDecisions ?? hermes.sealedDecisions;

  const liveHasExposure = openPnl !== null && (openPaths ?? 0) > 0;
  const openLabel =
    openPaths === null
      ? hermes.pathsCount === null
        ? '—'
        : hermes.pathsCount === 1
          ? '1 watched'
          : `${hermes.pathsCount} watched`
      : openPaths === 1
        ? '1 open'
        : `${openPaths} open`;

  return (
    <div className="obs-portraits home-portraits" aria-label="Solace instruments">
      {/* Product units: copy above device on mobile (Apple stack); device first on desktop grid. */}
      <Link href="/hermes" className="obs-portrait is-link product-unit">
        <span className="obs-portrait-caption">
          <strong>Hermes</strong>
          <em>Capital allocation · Live</em>
          <span className="obs-portrait-desc">
            An autonomous instrument for capital allocation, built to grow what you
            entrust it with, with discipline you can verify, not take on faith.
          </span>
          <span className="obs-portrait-unit-cta">Meet Hermes</span>
        </span>
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
                  {liveHasExposure && openPnl !== null
                    ? pnlFormatter.format(openPnl)
                    : sealedDecisions !== null
                      ? sealedDecisions.toLocaleString('en-US')
                      : '—'}
                </strong>
                <span
                  className={`obs-portrait-delta${
                    liveHasExposure && openPnl !== null
                      ? openPnl > 0
                        ? ' is-pos'
                        : openPnl < 0
                          ? ' is-neg'
                          : ''
                      : ''
                  }`}
                >
                  {liveHasExposure && openPnl !== null
                    ? 'Unrealized · not a sealed row'
                    : sealedDecisions !== null
                      ? 'Rows on public chain'
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
      </Link>

      <Link href="/oracle" className="obs-portrait is-link product-unit">
        <span className="obs-portrait-caption">
          <strong>Oracle</strong>
          <em>Belief under uncertainty · Live</em>
          <span className="obs-portrait-desc">
            Live probability over real events, scored against what actually happened.
          </span>
          <span className="obs-portrait-unit-cta">Open Oracle</span>
        </span>
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
      </Link>

      <Link
        href="/glorya"
        className="obs-portrait is-link product-unit"
        aria-label="Glorya — open instrument"
      >
        <span className="obs-portrait-caption">
          <strong>Glorya</strong>
          <em>Humanitarian capital · Evaluating</em>
          <span className="obs-portrait-desc">
            Allocating humanitarian capital only when intervention can change the outcome.
          </span>
          <span className="obs-portrait-unit-cta">Open Glorya</span>
        </span>
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
      </Link>
    </div>
  );
}
