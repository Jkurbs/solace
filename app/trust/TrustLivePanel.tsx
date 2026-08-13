'use client';

import { useEffect, useState } from 'react';

import { hasLiveExposure, useTrustLivePulse } from './TrustLivePulse';

const sealedAtFormatter = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  hour: 'numeric',
  hour12: true,
  minute: '2-digit',
  month: 'short',
  timeZone: 'America/New_York',
  timeZoneName: 'short',
  year: 'numeric',
});

const pnlFormatter = new Intl.NumberFormat('en-US', {
  currency: 'USD',
  maximumFractionDigits: 4,
  minimumFractionDigits: 2,
  signDisplay: 'always',
  style: 'currency',
});

function directionSuffix(sides: Array<'LONG' | 'SHORT'>): string {
  if (!sides.length) return '';

  const long = sides.filter((side) => side === 'LONG').length;
  const short = sides.filter((side) => side === 'SHORT').length;

  if (long && !short) return ' long';
  if (short && !long) return ' short';
  return ` (${long} long · ${short} short)`;
}

function decisionLabel(
  paths: number,
  sides: Array<'LONG' | 'SHORT'>,
  unrealizedPnl: number,
) {
  if (paths > 0) {
    const pathWord = paths === 1 ? 'one open path' : `${paths} open paths`;
    return `Holding ${pathWord}${directionSuffix(sides)}`;
  }

  if (unrealizedPnl === 0) {
    return 'Flat · no open exposure';
  }

  return 'Open exposure';
}

function resolveLivePosture(briefPosture: string, pulse: { paths: number; unrealizedPnl: number | null }) {
  const hasExposure =
    pulse.paths > 0 || (pulse.unrealizedPnl !== null && Math.abs(pulse.unrealizedPnl) > 1e-9);
  const briefSaysStandingDown = briefPosture.toLowerCase().includes('standing');

  if (hasExposure && briefSaysStandingDown) {
    return 'Deployed';
  }

  return briefPosture;
}

function pnlToneClass(unrealizedPnl: number) {
  if (unrealizedPnl > 0) {
    return 'trust-pnl-pos';
  }

  if (unrealizedPnl < 0) {
    return 'trust-pnl-neg';
  }

  return undefined;
}

function useSecondsSince(iso: string | null) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!iso) {
      setSeconds(0);
      return;
    }

    const tick = () => {
      setSeconds(Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000)));
    };

    tick();
    const interval = window.setInterval(tick, 1000);

    return () => window.clearInterval(interval);
  }, [iso]);

  return seconds;
}

/**
 * Live open exposure sits outside the historical ledger table so paging and
 * horizontal scroll never bury it. Sticky within the sheet while the page scrolls.
 */
export default function TrustLivePanel() {
  const { livePosture, pulse } = useTrustLivePulse();
  const displayedPosture = resolveLivePosture(livePosture, pulse);
  const secondsSince = useSecondsSince(pulse.asOf);

  if (!hasLiveExposure(pulse)) {
    return (
      <div className="ledger-live-panel is-flat" aria-label="Live open exposure">
        <div className="ledger-live-panel-mark">
          <span className="trust-open-live is-quiet" aria-hidden="true" />
          <span className="ledger-live-panel-kicker">Live</span>
        </div>
        <div className="ledger-live-panel-body">
          <p className="ledger-live-panel-title">No open exposure right now</p>
          <p className="ledger-live-panel-note">
            When Hermes holds a path, unrealized PnL will sit here — fixed above the sealed history, not mixed into it.
          </p>
        </div>
        <div className="ledger-live-panel-meta">
          <span>
            <em>Posture</em>
            <strong>{displayedPosture === '--' ? '—' : displayedPosture}</strong>
          </span>
        </div>
      </div>
    );
  }

  const unrealizedPnl = pulse.unrealizedPnl as number;

  return (
    <div className="ledger-live-panel" aria-label="Live open exposure" aria-live="polite">
      <div className="ledger-live-panel-mark">
        <span className="trust-open-live" aria-hidden="true" />
        <span className="ledger-live-panel-kicker">Live</span>
      </div>
      <div className="ledger-live-panel-body">
        <p className="ledger-live-panel-title">
          {decisionLabel(pulse.paths, pulse.sides ?? [], unrealizedPnl)}
        </p>
        <p className="ledger-live-panel-note">
          Unrealized · moves with the market · instrument named when the path closes. Not a sealed ledger row.
        </p>
        <p className="ledger-live-panel-asof">
          {sealedAtFormatter.format(new Date(pulse.asOf as string))}
          {secondsSince < 120 ? ` · ${secondsSince}s ago` : ''}
          {pulse.hermesVersion ? ` · Hermes v${pulse.hermesVersion}` : ''}
        </p>
      </div>
      <div className="ledger-live-panel-meta">
        <span>
          <em>Posture</em>
          <strong>{displayedPosture}</strong>
        </span>
        <span>
          <em>Open PnL</em>
          <strong className={pnlToneClass(unrealizedPnl)}>{pnlFormatter.format(unrealizedPnl)}</strong>
        </span>
        {pulse.paths > 0 ? (
          <span>
            <em>Status</em>
            <strong>Open</strong>
          </span>
        ) : null}
      </div>
    </div>
  );
}
