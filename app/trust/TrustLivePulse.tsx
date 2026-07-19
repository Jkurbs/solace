'use client';

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export type LedgerPulse = {
  asOf: string | null;
  chainHead: string | null;
  hermesVersion: string | null;
  hermesVersionLabel: string | null;
  latestRecordId: string | null;
  paths: number;
  rowCount: number;
  unrealizedPnl: number | null;
};

type TrustLivePulseContextValue = {
  livePosture: string;
  pulse: LedgerPulse;
};

const PULSE_MS = 1_000;
const SAFETY_REFRESH_MS = 60_000;

const TrustLivePulseContext = createContext<TrustLivePulseContextValue | null>(null);

function toPulse(
  exposure: { asOf: string; unrealizedPnl: number; positions: unknown[] } | null,
  version?: { id: string; label: string } | null,
): LedgerPulse {
  return {
    asOf: exposure?.asOf ?? null,
    chainHead: null,
    hermesVersion: version?.id ?? null,
    hermesVersionLabel: version?.label ?? null,
    latestRecordId: null,
    paths: exposure?.positions.length ?? 0,
    rowCount: 0,
    unrealizedPnl: exposure?.unrealizedPnl ?? null,
  };
}

function structuralFingerprint(pulse: LedgerPulse) {
  return JSON.stringify({
    chainHead: pulse.chainHead,
    latestRecordId: pulse.latestRecordId,
    rowCount: pulse.rowCount,
  });
}

export function TrustLivePulseProvider({
  children,
  initialExposure,
  initialHermesVersion,
  livePosture,
}: {
  children: React.ReactNode;
  initialExposure: { asOf: string; unrealizedPnl: number; positions: unknown[] } | null;
  initialHermesVersion?: { id: string; label: string } | null;
  livePosture: string;
}) {
  const router = useRouter();
  const [pulse, setPulse] = useState<LedgerPulse>(() => toPulse(initialExposure, initialHermesVersion));
  const lastStructural = useRef<string | null>(null);
  const lastRefresh = useRef<number>(Date.now());

  useEffect(() => {
    let stopped = false;

    const tick = async () => {
      if (stopped || document.visibilityState !== 'visible') {
        return;
      }

      try {
        const response = await fetch(`/api/hermes/ledger-pulse?ts=${Date.now()}`, { cache: 'no-store' });

        if (!response.ok) {
          throw new Error(String(response.status));
        }

        const nextPulse = (await response.json()) as LedgerPulse;
        setPulse(nextPulse);

        const structural = structuralFingerprint(nextPulse);

        if (lastStructural.current === null) {
          lastStructural.current = structural;
          return;
        }

        if (structural !== lastStructural.current) {
          lastStructural.current = structural;
          lastRefresh.current = Date.now();
          router.refresh();
          return;
        }

        if (Date.now() - lastRefresh.current > SAFETY_REFRESH_MS) {
          lastRefresh.current = Date.now();
          router.refresh();
        }
      } catch {
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

  const value = useMemo(() => ({ livePosture, pulse }), [livePosture, pulse]);

  return <TrustLivePulseContext.Provider value={value}>{children}</TrustLivePulseContext.Provider>;
}

export function useTrustLivePulse() {
  const value = useContext(TrustLivePulseContext);

  if (!value) {
    throw new Error('useTrustLivePulse must be used within TrustLivePulseProvider');
  }

  return value;
}

export function hasLiveExposure(pulse: LedgerPulse) {
  return Boolean(pulse.asOf) && pulse.unrealizedPnl !== null;
}