import 'server-only';

import { listTrackedOpenPaths, parsePublicPositions } from '@/features/hermes-ledger/path-tracking';
import { getRuntimeSnapshot, saveRuntimeSnapshot } from '@/features/runtime-snapshots/store';
import { createSupabaseDataClient, isSupabaseDataClientConfigured } from '@/lib/supabase/server';
import type { Json } from '@/lib/supabase/types';

// Live open-exposure read for the public ledger strip: unrealized PnL from
// the latest NAV mark per pool, and drawdown measured from the historical
// peak equity. This is a live overlay, it is NOT part of the sealed record,
// and the page labels it that way.
export type HermesOpenExposure = {
  unrealizedPnl: number;
  grossEquity: number;
  peakEquity: number;
  /** 0..1 fraction below peak equity; 0 when at or above the peak. */
  drawdownFromPeak: number;
  asOf: string;
  /** Open position identities (symbol + side only, never size). */
  positions: Array<{ symbol: string; side: string; openedAt?: string }>;
};

const FRESHNESS_MS = 24 * 60 * 60 * 1000;
const LIVE_MARK_LIMIT = 12;
const EXPOSURE_CACHE_MS = 4_000;
const LIVE_OVERLAY_KEY = 'hermes_live_overlay';

type ExposureCache = { expiresAt: number; value: HermesOpenExposure | null };
let exposureCache: ExposureCache | null = null;

function isDegradedSourceMark(rawPayload: unknown) {
  if (!rawPayload || typeof rawPayload !== 'object') {
    return false;
  }

  const payload = rawPayload as Record<string, unknown>;
  return payload.positions_source === 'error' || payload.account_source === 'error';
}

function positionsFromTrackedKeys(keys: string[]) {
  const seen = new Set<string>();
  const positions: HermesOpenExposure['positions'] = [];

  for (const key of keys) {
    const separator = key.lastIndexOf(':');
    if (separator <= 0) continue;

    const symbol = key.slice(0, separator).trim().toUpperCase();
    const side = key.slice(separator + 1).trim().toUpperCase();

    if (!symbol || (side !== 'LONG' && side !== 'SHORT') || seen.has(`${symbol}:${side}`)) {
      continue;
    }

    seen.add(`${symbol}:${side}`);
    positions.push({ side, symbol });
  }

  return positions;
}

type SourceMarkRow = {
  pool_id: string;
  source_equity: unknown;
  source_unrealized_pnl: unknown;
  source_reserved_margin?: unknown;
  effective_at: string;
  raw_payload: unknown;
};

function isInconsistentEmptyBook(row: SourceMarkRow) {
  if (parsePublicPositions(row.raw_payload).length > 0) {
    return false;
  }

  const reserved = Number(row.source_reserved_margin ?? 0);
  const unrealized = readSourceUnrealizedPnl(row);

  // Empty positions with residual margin or open PnL is a dropped book, not a close.
  return (Number.isFinite(reserved) && reserved > 0.5) || Math.abs(unrealized) > 1e-6;
}

function isUnusableLiveMark(row: SourceMarkRow) {
  const equity = Number(row.source_equity ?? 0);
  return (
    isDegradedSourceMark(row.raw_payload) ||
    !Number.isFinite(equity) ||
    equity <= 0 ||
    isInconsistentEmptyBook(row)
  );
}

function readSourceUnrealizedPnl(row: { source_unrealized_pnl: unknown; raw_payload: unknown }) {
  const raw = row.raw_payload;

  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const fromPayload = Number((raw as Record<string, unknown>).unrealizedPnl);

    if (Number.isFinite(fromPayload)) {
      return fromPayload;
    }
  }

  return Number(row.source_unrealized_pnl ?? 0);
}

function parseStoredOverlay(value: unknown): HermesOpenExposure | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  const asOf = typeof record.asOf === 'string' ? record.asOf : '';
  const unrealizedPnl = Number(record.unrealizedPnl);
  const grossEquity = Number(record.grossEquity);
  const peakEquity = Number(record.peakEquity);
  const drawdownFromPeak = Number(record.drawdownFromPeak);
  const positions = Array.isArray(record.positions)
    ? record.positions.flatMap((entry) => {
        if (!entry || typeof entry !== 'object') {
          return [];
        }

        const position = entry as Record<string, unknown>;
        const symbol = String(position.symbol ?? '').trim().toUpperCase();
        const side = String(position.side ?? '').trim().toUpperCase();

        if (!symbol || (side !== 'LONG' && side !== 'SHORT')) {
          return [];
        }

        return [
          {
            side,
            symbol,
            ...(typeof position.openedAt === 'string' ? { openedAt: position.openedAt } : {}),
          },
        ];
      })
    : [];

  if (!asOf || !Number.isFinite(unrealizedPnl) || !Number.isFinite(grossEquity) || !Number.isFinite(peakEquity)) {
    return null;
  }

  if (Date.now() - new Date(asOf).getTime() > FRESHNESS_MS) {
    return null;
  }

  return {
    asOf,
    drawdownFromPeak: Number.isFinite(drawdownFromPeak) ? drawdownFromPeak : 0,
    grossEquity,
    peakEquity,
    positions,
    unrealizedPnl,
  };
}

function rememberOverlay(value: HermesOpenExposure | null) {
  exposureCache = { expiresAt: Date.now() + EXPOSURE_CACHE_MS, value };
}

export async function ingestHermesLiveOverlay(mark: {
  effectiveAt: string;
  grossEquity: number;
  rawPayload: unknown;
  reservedMargin: number;
  unrealizedPnl: number;
}) {
  const row: SourceMarkRow = {
    effective_at: mark.effectiveAt,
    pool_id: 'live',
    raw_payload: mark.rawPayload,
    source_equity: mark.grossEquity,
    source_reserved_margin: mark.reservedMargin,
    source_unrealized_pnl: mark.unrealizedPnl,
  };

  if (isUnusableLiveMark(row)) {
    return;
  }

  let positions = parsePublicPositions(mark.rawPayload).map((position) => ({
    side: position.side,
    symbol: position.symbol,
    ...(position.openedAt ? { openedAt: position.openedAt } : {}),
  }));

  if (!positions.length) {
    const tracked = await listTrackedOpenPaths().catch(() => []);
    if (tracked.length) {
      positions = positionsFromTrackedKeys(tracked.map((entry) => entry.key));
    }
  }

  const previous = parseStoredOverlay(await getRuntimeSnapshot(LIVE_OVERLAY_KEY));
  const grossEquity = Math.round(mark.grossEquity * 100) / 100;
  const peakEquity = Math.round(Math.max(grossEquity, previous?.peakEquity ?? grossEquity) * 100) / 100;
  const overlay: HermesOpenExposure = {
    asOf: mark.effectiveAt,
    drawdownFromPeak: peakEquity > 0 ? Math.max(0, (peakEquity - grossEquity) / peakEquity) : 0,
    grossEquity,
    peakEquity,
    positions,
    unrealizedPnl: Math.round(mark.unrealizedPnl * 10_000) / 10_000,
  };

  await saveRuntimeSnapshot(LIVE_OVERLAY_KEY, overlay as unknown as Json);
  rememberOverlay(overlay);
}

export async function getHermesOpenExposure(): Promise<HermesOpenExposure | null> {
  if (exposureCache && exposureCache.expiresAt > Date.now()) {
    return exposureCache.value;
  }

  const stored = parseStoredOverlay(await getRuntimeSnapshot(LIVE_OVERLAY_KEY));
  if (stored) {
    rememberOverlay(stored);
    return stored;
  }

  const value = await readHermesOpenExposure();
  if (value) {
    await saveRuntimeSnapshot(LIVE_OVERLAY_KEY, value as unknown as Json);
  }
  rememberOverlay(value);
  return value;
}

async function readHermesOpenExposure(): Promise<HermesOpenExposure | null> {
  if (!isSupabaseDataClientConfigured()) {
    return null;
  }

  try {
    // Source marks are the bridge's raw exchange-account readings, the real
    // founder-capital numbers. (Pool NAV snapshots carry simulation-scaled
    // accounting and must never feed a public figure.)
    const supabase = await createSupabaseDataClient();
    const { data, error } = await supabase
      .from('hermes_pool_source_marks')
      .select('pool_id,source_equity,source_unrealized_pnl,source_reserved_margin,effective_at,raw_payload')
      .order('effective_at', { ascending: false })
      .limit(LIVE_MARK_LIMIT);

    if (error || !data?.length) {
      return null;
    }

    // When the bridge's exchange fetch fails transiently it still publishes a
    // mark, flagged positions_source/account_source: "error", with zeroed
    // PnL — or an empty book while margin is still reserved. Prefer the newest
    // HEALTHY mark per pool so the public number never flickers to flat.
    const latestByPool = new Map<string, (typeof data)[number]>();

    for (const row of data) {
      if (latestByPool.has(row.pool_id) || isUnusableLiveMark(row)) continue;
      latestByPool.set(row.pool_id, row);
    }

    const latest = [...latestByPool.values()];
    if (!latest.length) {
      return null;
    }

    const asOf = latest
      .map((row) => row.effective_at)
      .sort()
      .at(-1);

    if (!asOf || Date.now() - new Date(asOf).getTime() > FRESHNESS_MS) {
      // Stale marks: show nothing rather than a fake live number.
      return null;
    }

    let positions = latest.flatMap((row) =>
      parsePublicPositions(row.raw_payload).map((position) => ({
        side: position.side,
        symbol: position.symbol,
        ...(position.openedAt ? { openedAt: position.openedAt } : {}),
      })),
    );

    if (!positions.length) {
      const tracked = await listTrackedOpenPaths().catch(() => []);
      if (tracked.length) {
        positions = positionsFromTrackedKeys(tracked.map((entry) => entry.key));
      }
    }
    const grossEquity = latest.reduce((total, row) => total + Number(row.source_equity ?? 0), 0);
    const unrealizedPnl = latest.reduce((total, row) => total + readSourceUnrealizedPnl(row), 0);
    // Peak equity across the recent mark window (single Hermes pool today).
    const peakEquity = Math.max(grossEquity, ...data.map((row) => Number(row.source_equity ?? 0)));
    const drawdownFromPeak = peakEquity > 0 ? Math.max(0, (peakEquity - grossEquity) / peakEquity) : 0;

    return {
      asOf,
      drawdownFromPeak,
      grossEquity: Math.round(grossEquity * 100) / 100,
      peakEquity: Math.round(peakEquity * 100) / 100,
      positions,
      unrealizedPnl: Math.round(unrealizedPnl * 10_000) / 10_000,
    };
  } catch (error) {
    console.warn('[hermes-ledger] Open exposure read failed.', error);
    return null;
  }
}

const equityAtEntryCache = new Map<string, number>();

function cacheKeyForEquityAt(poolId: string, at: string) {
  return `${poolId}:${at}`;
}

function readCachedEquityAt(poolId: string, at: string) {
  return equityAtEntryCache.get(cacheKeyForEquityAt(poolId, at)) ?? null;
}

function writeCachedEquityAt(poolId: string, at: string, equity: number) {
  equityAtEntryCache.set(cacheKeyForEquityAt(poolId, at), equity);
}

/**
 * Source-account equity at or just before `at`, so a guest sim can scale
 * against the book they entered, not a later drawdown remainder.
 */
export async function getHermesSourceEquityAt({
  at,
  poolId,
}: {
  at: string;
  poolId: string;
}): Promise<number | null> {
  if (!isSupabaseDataClientConfigured() || !poolId.trim() || !at) {
    return readCachedEquityAt(poolId, at);
  }

  if (!Number.isFinite(new Date(at).getTime())) {
    return null;
  }

  const cached = readCachedEquityAt(poolId, at);

  try {
    const supabase = await createSupabaseDataClient();
    const { data, error } = await supabase
      .from('hermes_pool_source_marks')
      .select('source_equity,effective_at,raw_payload')
      .eq('pool_id', poolId)
      .lte('effective_at', at)
      .order('effective_at', { ascending: false })
      .limit(40);

    if (error) {
      console.warn('[hermes-ledger] Source equity-at lookup failed.', error.message);
      return cached;
    }

    const healthy = (data ?? []).find((row) => {
      const equity = Number(row.source_equity ?? 0);
      return Number.isFinite(equity) && equity > 0 && !isDegradedSourceMark(row.raw_payload);
    });

    if (healthy) {
      const equity = Math.round(Number(healthy.source_equity) * 100) / 100;
      writeCachedEquityAt(poolId, at, equity);
      return equity;
    }

    const { data: after, error: afterError } = await supabase
      .from('hermes_pool_source_marks')
      .select('source_equity,effective_at,raw_payload')
      .eq('pool_id', poolId)
      .gte('effective_at', at)
      .order('effective_at', { ascending: true })
      .limit(40);

    if (afterError) {
      return cached;
    }

    const next = (after ?? []).find((row) => {
      const equity = Number(row.source_equity ?? 0);
      return Number.isFinite(equity) && equity > 0 && !isDegradedSourceMark(row.raw_payload);
    });

    if (!next) {
      return cached;
    }

    const equity = Math.round(Number(next.source_equity) * 100) / 100;
    writeCachedEquityAt(poolId, at, equity);
    return equity;
  } catch (error) {
    console.warn('[hermes-ledger] Source equity-at lookup failed.', error);
    return cached;
  }
}
