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
  /** Open path directions from live marks (LONG / SHORT only). */
  sides: Array<'LONG' | 'SHORT'>;
  rowCount: number;
  unrealizedPnl: number | null;
};

type TrustLivePulseContextValue = {
  livePosture: string;
  pulse: LedgerPulse;
};

const PULSE_MS = 1_000;
const SAFETY_REFRESH_MS = 60_000;
/** Consecutive timestamped empty books required before dropping live exposure. */
const FLAT_CONFIRM_TICKS = 3;

const TrustLivePulseContext = createContext<TrustLivePulseContextValue | null>(null);

function sidesFromPositions(
  positions: Array<{ side?: string } | unknown> | undefined,
): Array<'LONG' | 'SHORT'> {
  if (!positions?.length) return [];
  return positions
    .map((position) => {
      if (!position || typeof position !== 'object') return null;
      const side = String((position as { side?: string }).side || '')
        .trim()
        .toUpperCase();
      return side === 'LONG' || side === 'SHORT' ? side : null;
    })
    .filter((side): side is 'LONG' | 'SHORT' => side !== null);
}

function toPulse(
  exposure: {
    asOf: string;
    unrealizedPnl: number;
    positions: Array<{ symbol?: string; side?: string } | unknown>;
  } | null,
  version?: { id: string; label: string } | null,
): LedgerPulse {
  return {
    asOf: exposure?.asOf ?? null,
    chainHead: null,
    hermesVersion: version?.id ?? null,
    hermesVersionLabel: version?.label ?? null,
    latestRecordId: null,
    paths: exposure?.positions.length ?? 0,
    sides: sidesFromPositions(exposure?.positions),
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
  const inFlight = useRef(false);
  const emptyStreak = useRef(0);

  useEffect(() => {
    let stopped = false;

    const applyPulse = (nextPulse: LedgerPulse) => {
      setPulse((previous) => {
        if (hasLiveExposure(nextPulse)) {
          emptyStreak.current = 0;
          return nextPulse;
        }

        // Missed read (no asOf): keep the last book instead of flashing flat.
        if (!nextPulse.asOf) {
          return previous;
        }

        if (hasLiveExposure(previous)) {
          emptyStreak.current += 1;
          if (emptyStreak.current < FLAT_CONFIRM_TICKS) {
            return {
              ...previous,
              chainHead: nextPulse.chainHead ?? previous.chainHead,
              hermesVersion: nextPulse.hermesVersion ?? previous.hermesVersion,
              hermesVersionLabel: nextPulse.hermesVersionLabel ?? previous.hermesVersionLabel,
              latestRecordId: nextPulse.latestRecordId ?? previous.latestRecordId,
              rowCount: nextPulse.rowCount || previous.rowCount,
            };
          }
        }

        emptyStreak.current = 0;
        return nextPulse;
      });
    };

    const tick = async () => {
      if (stopped || document.visibilityState !== 'visible' || inFlight.current) {
        return;
      }

      inFlight.current = true;

      try {
        const response = await fetch(`/api/hermes/ledger-pulse?ts=${Date.now()}`, { cache: 'no-store' });

        if (!response.ok) {
          throw new Error(String(response.status));
        }

        const nextPulse = (await response.json()) as LedgerPulse;
        applyPulse(nextPulse);

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
      } finally {
        inFlight.current = false;
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
  const heldPnl =
    pulse.unrealizedPnl !== null && Math.abs(pulse.unrealizedPnl) > 1e-9;
  return Boolean(pulse.asOf) && (pulse.paths > 0 || heldPnl);
}