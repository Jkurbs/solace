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

function decisionLabel(paths: number, unrealizedPnl: number) {
  if (paths > 0) {
    return `Holding ${paths === 1 ? 'one open path' : `${paths} open paths`}`;
  }

  if (unrealizedPnl === 0) {
    return 'Flat · no open exposure';
  }

  return 'Open exposure';
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

export default function TrustLiveRow() {
  const { livePosture, pulse } = useTrustLivePulse();
  const secondsSince = useSecondsSince(pulse.asOf);

  if (!hasLiveExposure(pulse)) {
    return null;
  }

  const unrealizedPnl = pulse.unrealizedPnl as number;

  return (
    <tr className="trust-live-row">
      <td className="trust-row-number">
        <span className="trust-open-live" aria-hidden="true" />
      </td>
      <td>
        {sealedAtFormatter.format(new Date(pulse.asOf as string))}
        {secondsSince < 120 ? ` · ${secondsSince}s ago` : ''}
        <span className="trust-record-id">LIVE</span>
      </td>
      <td>{decisionLabel(pulse.paths, unrealizedPnl)}</td>
      <td>{livePosture}</td>
      <td>Open</td>
      <td className={pnlToneClass(unrealizedPnl)}>{pnlFormatter.format(unrealizedPnl)}</td>
      <td>Live unrealized. Moves with the market; instrument named when the path closes.</td>
    </tr>
  );
}