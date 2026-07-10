'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

// Change-driven refresh: poll the ~200-byte pulse endpoint frequently and
// re-fetch the full server render only when something actually changed
// (new sealed row, fresh mark, moved PnL). Faster than a blind timer and
// ~100x cheaper between changes. A slow safety refresh covers pulse
// failures. Polls only while the tab is visible.
const PULSE_MS = 1_500;
const SAFETY_REFRESH_MS = 60_000;

type Pulse = {
  asOf: string | null;
  chainHead: string | null;
  latestRecordId: string | null;
  paths: number;
  rowCount: number;
  unrealizedPnl: number | null;
};

export default function TrustAutoRefresh() {
  const router = useRouter();
  const lastPulse = useRef<string | null>(null);
  const lastRefresh = useRef<number>(Date.now());

  useEffect(() => {
    let stopped = false;

    const tick = async () => {
      if (stopped || document.visibilityState !== 'visible') {
        return;
      }

      try {
        const response = await fetch('/api/hermes/ledger-pulse', { cache: 'no-store' });

        if (!response.ok) {
          throw new Error(String(response.status));
        }

        const pulse = (await response.json()) as Pulse;
        const fingerprint = JSON.stringify(pulse);

        if (lastPulse.current === null) {
          lastPulse.current = fingerprint;
          return;
        }

        if (fingerprint !== lastPulse.current) {
          lastPulse.current = fingerprint;
          lastRefresh.current = Date.now();
          router.refresh();
          return;
        }

        if (Date.now() - lastRefresh.current > SAFETY_REFRESH_MS) {
          lastRefresh.current = Date.now();
          router.refresh();
        }
      } catch {
        // Pulse unavailable: fall back to the slow safety refresh.
        if (Date.now() - lastRefresh.current > SAFETY_REFRESH_MS) {
          lastRefresh.current = Date.now();
          router.refresh();
        }
      }
    };

    const interval = window.setInterval(tick, PULSE_MS);
    tick();

    return () => {
      stopped = true;
      window.clearInterval(interval);
    };
  }, [router]);

  return null;
}
