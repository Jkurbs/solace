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
//
// After a close, marks can still list the instrument for a few ticks (exchange
// lag). Without a cooldown, popOpenPathRef clears tracking and the next stale
// mark re-seals a ghost open (HYPE: close HMS-T-66284082, then HMS-103 open
// while marks still showed HYPE-USDT LONG).
const OPEN_PATHS_KEY = 'hermes_open_paths';
/** Ignore mark-driven re-opens for the same symbol:side after a close. */
const RECENTLY_CLOSED_TTL_MS = 20 * 60 * 1000;

type OpenEntry = { recordId: string; openedAt: string };
type OpenPathState = Record<string, OpenEntry>;

type OpenPathBook = {
  opens: OpenPathState;
  /** ISO timestamps of recent closes, keyed by SYMBOL:SIDE. */
  recentlyClosed: Record<string, string>;
};

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

function isLegacyOpenState(stored: Record<string, unknown>): stored is OpenPathState {
  if ('opens' in stored || 'recentlyClosed' in stored) {
    return false;
  }

  const values = Object.values(stored);

  if (!values.length) {
    return true;
  }

  return values.every(
    (value) =>
      Boolean(value) &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      typeof (value as OpenEntry).recordId === 'string',
  );
}

async function readBook(): Promise<OpenPathBook> {
  const stored = await getRuntimeSnapshot(OPEN_PATHS_KEY).catch(() => null);

  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) {
    return { opens: {}, recentlyClosed: {} };
  }

  const record = stored as Record<string, unknown>;

  if (isLegacyOpenState(record)) {
    return { opens: { ...record }, recentlyClosed: {} };
  }

  const opens =
    record.opens && typeof record.opens === 'object' && !Array.isArray(record.opens)
      ? ({ ...record.opens } as OpenPathState)
      : {};
  const recentlyClosed =
    record.recentlyClosed && typeof record.recentlyClosed === 'object' && !Array.isArray(record.recentlyClosed)
      ? ({ ...record.recentlyClosed } as Record<string, string>)
      : {};

  return { opens, recentlyClosed };
}

async function writeBook(book: OpenPathBook) {
  await saveRuntimeSnapshot(OPEN_PATHS_KEY, book as unknown as Json);
}

function pruneRecentlyClosed(recentlyClosed: Record<string, string>, nowMs: number) {
  let changed = false;

  for (const [key, closedAt] of Object.entries(recentlyClosed)) {
    const closedMs = new Date(closedAt).getTime();

    if (!Number.isFinite(closedMs) || nowMs - closedMs > RECENTLY_CLOSED_TTL_MS) {
      delete recentlyClosed[key];
      changed = true;
    }
  }

  return changed;
}

function isInCloseCooldown(recentlyClosed: Record<string, string>, key: string, nowMs: number) {
  const closedAt = recentlyClosed[key];

  if (!closedAt) {
    return false;
  }

  const closedMs = new Date(closedAt).getTime();

  return Number.isFinite(closedMs) && nowMs - closedMs <= RECENTLY_CLOSED_TTL_MS;
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

    const book = await readBook();
    const nowMs = Date.now();
    let changed = pruneRecentlyClosed(book.recentlyClosed, nowMs);
    const activeKeys = new Set(positions.map((position) => pathKey(position.symbol, position.side)));

    // Side flips and stale bookkeeping keys must not leave a dead LONG entry
    // blocking a live SHORT (or vice versa) and re-sealing every mark tick.
    for (const key of Object.keys(book.opens)) {
      if (!activeKeys.has(key)) {
        delete book.opens[key];
        changed = true;
      }
    }

    for (const position of positions) {
      const key = pathKey(position.symbol, position.side);

      if (book.opens[key]) {
        continue;
      }

      // Stale mark after a real close: do not mint a ghost open.
      if (isInCloseCooldown(book.recentlyClosed, key, nowMs)) {
        continue;
      }

      const snapshot = await getStoredHermesBriefSnapshot().catch(() => null);
      const existing = await listHermesLedgerRows(1000);
      const nextRecordNumber =
        existing.reduce((max, row) => {
          const match = row.recordId.match(/^HMS-(\d+)$/);

          return match ? Math.max(max, Number(match[1])) : max;
        }, 0) + 1;
      const recordId = `HMS-${String(nextRecordNumber).padStart(3, '0')}`;
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
        book.opens[key] = { openedAt: sealedAt, recordId: row.recordId };
        changed = true;
      }
    }

    if (changed) {
      await writeBook(book);
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
 *
 * Also arms a cooldown so lagging marks that still list the symbol cannot
 * immediately re-seal a new open for the same path.
 */
export async function popOpenPathRef(symbol: string, side: string): Promise<string | null> {
  try {
    const book = await readBook();
    const key = pathKey(symbol, side);
    const entry = book.opens[key];
    const closedAt = new Date().toISOString();

    // Always record the close cooldown, even if we lacked an open entry
    // (pre-schema or state loss) — still blocks ghost re-opens from stale marks.
    book.recentlyClosed[key] = closedAt;
    pruneRecentlyClosed(book.recentlyClosed, Date.now());

    if (entry) {
      delete book.opens[key];
    }

    await writeBook(book);

    return entry?.recordId ?? null;
  } catch (error) {
    console.warn('[hermes-ledger] Open path ref lookup failed.', error);
    return null;
  }
}
