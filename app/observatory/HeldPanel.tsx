'use client';

import TrustLivePanel from '@/app/trust/TrustLivePanel';
import { TrustLivePulseProvider } from '@/app/trust/TrustLivePulse';

export default function HeldPanel({
  exposure,
  hermesVersion,
  livePosture,
}: {
  exposure: {
    asOf: string;
    unrealizedPnl: number;
    positions: Array<{ symbol: string; side: string }>;
  } | null;
  hermesVersion: { id: string; label: string };
  livePosture: string;
}) {
  return (
    <TrustLivePulseProvider
      initialExposure={exposure}
      initialHermesVersion={hermesVersion}
      livePosture={livePosture}
    >
      <TrustLivePanel />
    </TrustLivePulseProvider>
  );
}
