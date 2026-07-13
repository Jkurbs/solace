'use client';

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

export default function TrustLiveRow() {
  const { livePosture, pulse } = useTrustLivePulse();

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