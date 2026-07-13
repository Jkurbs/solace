'use client';

import { hasLiveExposure, useTrustLivePulse } from './TrustLivePulse';

const pnlFormatter = new Intl.NumberFormat('en-US', {
  currency: 'USD',
  maximumFractionDigits: 4,
  minimumFractionDigits: 2,
  signDisplay: 'always',
  style: 'currency',
});

const metaTimeFormatter = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  hour: 'numeric',
  hour12: true,
  minute: '2-digit',
  month: 'short',
  timeZone: 'America/New_York',
  timeZoneName: 'short',
});

function pnlToneClass(unrealizedPnl: number) {
  if (unrealizedPnl > 0) {
    return 'trust-pnl-pos';
  }

  if (unrealizedPnl < 0) {
    return 'trust-pnl-neg';
  }

  return undefined;
}

export default function TrustLivePnL() {
  const { pulse } = useTrustLivePulse();

  if (!hasLiveExposure(pulse)) {
    return (
      <>
        <strong>--</strong>
      </>
    );
  }

  const unrealizedPnl = pulse.unrealizedPnl as number;

  return (
    <>
      <strong className={pnlToneClass(unrealizedPnl)}>{pnlFormatter.format(unrealizedPnl)}</strong>
      <span className="trust-meta-sub">as of {metaTimeFormatter.format(new Date(pulse.asOf as string))}</span>
    </>
  );
}