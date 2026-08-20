'use client';

import TrustLivePanel from '@/app/trust/TrustLivePanel';
import { TrustLivePulseProvider } from '@/app/trust/TrustLivePulse';

export default function HeldPanel({
  exposure,
  hermesVersion,
  livePosture,
  winRate = null,
  winRateSample = 0,
}: {
  exposure: {
    asOf: string;
    unrealizedPnl: number;
    positions: Array<{ symbol: string; side: string }>;
  } | null;
  hermesVersion: { id: string; label: string };
  livePosture: string;
  winRate?: number | null;
  winRateSample?: number;
}) {
  return (
    <TrustLivePulseProvider
      initialExposure={exposure}
      initialHermesVersion={hermesVersion}
      livePosture={livePosture}
    >
      <TrustLivePanel winRate={winRate} winRateSample={winRateSample} />
    </TrustLivePulseProvider>
  );
}
