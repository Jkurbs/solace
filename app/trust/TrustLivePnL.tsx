'use client';

import { useEffect, useState } from 'react';

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

export default function TrustLivePnL() {
  const { pulse } = useTrustLivePulse();
  const secondsSince = useSecondsSince(pulse.asOf);

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
      <span className="trust-meta-sub">
        as of {metaTimeFormatter.format(new Date(pulse.asOf as string))}
        {secondsSince < 120 ? ` · ${secondsSince}s ago` : ''}
      </span>
    </>
  );
}