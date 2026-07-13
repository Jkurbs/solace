import 'server-only';

import { getStoredHermesBriefSnapshot } from '@/features/hermes-brief-snapshot/store';
import { getRuntimeSnapshot, saveRuntimeSnapshot } from '@/features/runtime-snapshots/store';
import type { Json } from '@/lib/supabase/types';

import { listHermesLedgerRows, sealHermesLedgerRow } from './store';

// Two-row path schema: when a new position appears in the pool-mark feed, an
// OPEN row is sealed immediately — instrument, direction, and size withheld
// (mechanism stays private) — so the commitment is on the chain before the
// outcome exists. The close row later references it via `ref`, making the
// sealed-first property checkable per trade instead of a policy statement.
//
// Detection rides the mark cadence (~1–2 min), so an open row is sealed
// within minutes of the commitment, not at the instant of it. The row's
// sealed_at is the mark's effective time: honest, slightly late by design.
const OPEN_PATHS_KEY = 'hermes_open_paths';

type OpenPathState = Record<string, { recordId: string; openedAt: string }>;

function pathKey(symbol: string, side: string) {
  return `${symbol.trim().toUpperCase()}:${side.trim().toUpperCase()}`;
}

function parsePositionIdentity(
  record: Record<string, unknown>,
  seen: Set<string>,
  parsed: Array<{ symbol: string; side: string }>,
) {
  const symbol = typeof record.symbol === 'string' ? record.symbol.trim().toUpperCase() : '';
  const side = typeof record.side === 'string' ? record.side.trim().toUpperCase() : '';

  if (!symbol || !['LONG', 'SHORT'].includes(side) || seen.has(`${symbol}:${side}`)) {
    return;
  }

  seen.add(`${symbol}:${side}`);
  parsed.push({ side, symbol });
}

function parseAllocationIdentity(
  record: Record<string, unknown>,
  seen: Set<string>,
  parsed: Array<{ symbol: string; side: string }>,
) {
  const side = typeof record.side === 'string' ? record.side.trim().toUpperCase() : '';
  const asset = typeof record.asset === 'string' ? record.asset.trim().toUpperCase() : '';

  if (!asset || asset === 'CASH' || !['LONG', 'SHORT'].includes(side)) {
    return;
  }

  parsePositionIdentity({ side, symbol: `${asset}-USDT` }, seen, parsed);
}

export function parsePublicPositions(rawPayload: unknown): Array<{ symbol: string; side: string }> {
  if (!rawPayload || typeof rawPayload !== 'object') {
    return [];
  }

  const payload = rawPayload as Record<string, unknown>;
  const seen = new Set<string>();
  const parsed: Array<{ symbol: string; side: string }> = [];

  if (Array.isArray(payload.positions)) {
    for (const entry of payload.positions) {
      if (!entry || typeof entry !== 'object') {
        continue;
      }

      parsePositionIdentity(entry as Record<string, unknown>, seen, parsed);
    }
  }

  if (!parsed.length && Array.isArray(payload.allocations)) {
    for (const entry of payload.allocations) {
      if (!entry || typeof entry !== 'object') {
        continue;
      }

      parseAllocationIdentity(entry as Record<string, unknown>, seen, parsed);
    }
  }

  return parsed;
}

async function readState(): Promise<OpenPathState> {
  const stored = await getRuntimeSnapshot(OPEN_PATHS_KEY).catch(() => null);

  return stored && typeof stored === 'object' && !Array.isArray(stored) ? (stored as OpenPathState) : {};
}

/**
 * Called from the pool-mark ingest after a healthy mark stores. Seals an
 * open row for every position not already tracked. Positions that vanish
 * are NOT closed here — close rows come only from the trade-events feed,
 * which carries the realized result.
 */
export async function trackOpenPathsFromMark(rawPayload: unknown, effectiveAt?: string) {
  try {
    const positions = parsePublicPositions(rawPayload);

    // A degraded mark (positions_source: error) reports no positions; never
    // treat that as "everything closed", and never seal opens from it.
    const payload = rawPayload as Record<string, unknown> | null;

    if (!positions.length || payload?.positions_source === 'error') {
      return;
    }

    const state = await readState();
    let changed = false;

    for (const position of positions) {
      const key = pathKey(position.symbol, position.side);

      if (state[key]) {
        continue;
      }

      const snapshot = await getStoredHermesBriefSnapshot().catch(() => null);
      const existing = await listHermesLedgerRows(1000);
      const recordId = `HMS-${String(existing.length + 1).padStart(3, '0')}`;
      const sealedAt = effectiveAt ?? new Date().toISOString();
      const row = await sealHermesLedgerRow({
        decision: 'Opened a path — instrument private until close',
        eventType: 'open',
        note: '',
        posture: snapshot && snapshot.brief_id !== 'fallback' ? snapshot.posture : 'DEPLOYED',
        recordId,
        sealedAt,
      });

      if (row) {
        state[key] = { openedAt: sealedAt, recordId: row.recordId };
        changed = true;
      }
    }

    if (changed) {
      await saveRuntimeSnapshot(OPEN_PATHS_KEY, state as unknown as Json);
    }
  } catch (error) {
    console.warn('[hermes-ledger] Open path tracking failed.', error);
  }
}

/**
 * Called from the trade-events ingest when a close seals: returns (and
 * consumes) the open row's record id for the `ref` field. Null for paths
 * opened before the two-row schema existed — those closes are honestly
 * unpaired; the pairing record begins at cutover.
 */
export async function popOpenPathRef(symbol: string, side: string): Promise<string | null> {
  try {
    const state = await readState();
    const key = pathKey(symbol, side);
    const entry = state[key];

    if (!entry) {
      return null;
    }

    delete state[key];
    await saveRuntimeSnapshot(OPEN_PATHS_KEY, state as unknown as Json);

    return entry.recordId;
  } catch (error) {
    console.warn('[hermes-ledger] Open path ref lookup failed.', error);
    return null;
  }
}
