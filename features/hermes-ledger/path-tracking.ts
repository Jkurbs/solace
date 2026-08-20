import 'server-only';

import { getStoredHermesBriefSnapshot } from '@/features/hermes-brief-snapshot/store';
import { getRuntimeSnapshot, saveRuntimeSnapshot } from '@/features/runtime-snapshots/store';
import type { Json } from '@/lib/supabase/types';

import { listHermesLedgerRows, listUnpairedHermesOpenRows, sealHermesLedgerRow } from './store';

// Two-row path schema: when a new position appears in the pool-mark feed, an
// OPEN row is sealed immediately, instrument, direction, and size withheld
// (mechanism stays private), so the commitment is on the chain before the
// outcome exists. The close row later references it via `ref`.
//
// Failure modes we harden against:
// 1) Ghost re-open after close: lagging marks still list the symbol → cooldown.
// 2) Open spam (July 14): same live position sealed every mark because tracking
//    state did not stick / concurrent ingests both saw empty state → process
//    mutex, memory cache, re-read before seal, immediate durable write.
// 3) Premature drop: deleting opens when a mark omits a symbol (flicker or
//    switch) left chain opens unpaired and allowed re-seals → opens are only
//    removed on close (popOpenPathRef), never because a mark is missing them.
// 4) Restart re-open: killing the ingest/API drops memory. If the snapshot
//    is empty too, the next mark looks like a brand-new path and reseals.
//    The sealed chain is the source of truth: adopt unpaired open rows
//    only when the tracking book looks lost (restart), never after a
//    real close — leftover unpaired spam must not swallow a new path.
const OPEN_PATHS_KEY = 'hermes_open_paths';
/** Ignore mark-driven re-opens for the same identity after a close. */
const RECENTLY_CLOSED_TTL_MS = 20 * 60 * 1000;

type OpenEntry = {
  recordId: string;
  openedAt: string;
  positionId?: string;
  exchangeOpenedAt?: string;
};
type OpenPathState = Record<string, OpenEntry>;
type CloseRecord = {
  closedAt: string;
  positionId?: string;
  openedAt?: string;
  /** A later healthy mark omitted this key, so a reappearance is a new path. */
  confirmedAbsent?: boolean;
};

type OpenPathBook = {
  opens: OpenPathState;
  recentlyClosed: Record<string, CloseRecord>;
};

type LivePosition = {
  symbol: string;
  side: string;
  openedAt?: string;
  positionId?: string;
};

function identitySymbol(symbol: string) {
  return symbol.trim().toUpperCase().replace(/[-/:_]/g, '');
}

function pathKey(symbol: string, side: string) {
  return `${identitySymbol(symbol)}:${side.trim().toUpperCase()}`;
}

function canonicalKeyFromStored(key: string) {
  const separator = key.lastIndexOf(':');

  if (separator <= 0) {
    return key.trim().toUpperCase();
  }

  return pathKey(key.slice(0, separator), key.slice(separator + 1));
}

/** Collapse BTC-USDT:LONG / BTCUSDT:LONG (and leftover snapshot keys) to one identity. */
function canonicalizeBook(book: OpenPathBook): boolean {
  let changed = false;
  const opens: OpenPathState = {};

  for (const [key, entry] of Object.entries(book.opens)) {
    const canonical = canonicalKeyFromStored(key);

    if (canonical !== key) {
      changed = true;
    }

    const existing = opens[canonical];

    if (!existing || new Date(entry.openedAt).getTime() < new Date(existing.openedAt).getTime()) {
      if (existing) {
        changed = true;
      }

      opens[canonical] = entry;
    } else {
      changed = true;
    }
  }

  const recentlyClosed: Record<string, CloseRecord> = {};

  for (const [key, closed] of Object.entries(book.recentlyClosed)) {
    const canonical = canonicalKeyFromStored(key);

    if (canonical !== key) {
      changed = true;
    }

    const existing = recentlyClosed[canonical];

    if (!existing || new Date(closed.closedAt).getTime() > new Date(existing.closedAt).getTime()) {
      recentlyClosed[canonical] = closed;
    }
  }

  book.opens = opens;
  book.recentlyClosed = recentlyClosed;

  return changed;
}

function readIsoField(value: unknown): string | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const ms = value > 1e12 ? value : value * 1000;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  }

  if (typeof value !== 'string' || !value.trim()) {
    return undefined;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function readPositionId(record: Record<string, unknown>): string | undefined {
  const raw = record.sourcePositionId ?? record.source_position_id ?? record.positionId ?? record.position_id ?? record.id;
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return String(raw);
  }

  return typeof raw === 'string' && raw.trim() ? raw.trim() : undefined;
}

function readOpenedAt(record: Record<string, unknown>): string | undefined {
  return (
    readIsoField(record.openedAt) ??
    readIsoField(record.opened_at) ??
    readIsoField(record.openTime) ??
    readIsoField(record.open_time)
  );
}

function parsePositionIdentity(record: Record<string, unknown>, seen: Set<string>, parsed: LivePosition[]) {
  const symbol = typeof record.symbol === 'string' ? record.symbol.trim().toUpperCase() : '';
  const side = typeof record.side === 'string' ? record.side.trim().toUpperCase() : '';

  if (!symbol || !['LONG', 'SHORT'].includes(side)) {
    return;
  }

  const key = pathKey(symbol, side);

  if (seen.has(key)) {
    return;
  }

  seen.add(key);
  const openedAt = readOpenedAt(record);
  const positionId = readPositionId(record);
  parsed.push({
    side,
    symbol,
    ...(openedAt ? { openedAt } : {}),
    ...(positionId ? { positionId } : {}),
  });
}

function parseAllocationIdentity(record: Record<string, unknown>, seen: Set<string>, parsed: LivePosition[]) {
  const side = typeof record.side === 'string' ? record.side.trim().toUpperCase() : '';
  const asset = typeof record.asset === 'string' ? record.asset.trim().toUpperCase() : '';

  if (!asset || asset === 'CASH' || !['LONG', 'SHORT'].includes(side)) {
    return;
  }

  parsePositionIdentity({ side, symbol: `${asset}-USDT` }, seen, parsed);
}

export function parsePublicPositions(rawPayload: unknown): LivePosition[] {
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

function emptyBook(): OpenPathBook {
  return { opens: {}, recentlyClosed: {} };
}

function cloneBook(book: OpenPathBook): OpenPathBook {
  return {
    opens: { ...book.opens },
    recentlyClosed: { ...book.recentlyClosed },
  };
}

// Warm-instance cache: July 14 spam pattern was re-sealing every mark because
// durable state was empty on each tick. Memory covers the common single-region
// bridge → one Vercel instance path; disk remains source of truth across cold starts.
let memoryBook: OpenPathBook | null = null;

function isLegacyOpenStateRecord(stored: Record<string, unknown>): boolean {
  return isLegacyOpenState(stored);
}

function closeRecordFromStored(value: unknown): CloseRecord | null {
  if (typeof value === 'string') {
    return { closedAt: value };
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const closedAt = typeof record.closedAt === 'string' ? record.closedAt : null;

  if (!closedAt) {
    return null;
  }

  return {
    closedAt,
    ...(typeof record.positionId === 'string' && record.positionId ? { positionId: record.positionId } : {}),
    ...(typeof record.openedAt === 'string' && record.openedAt ? { openedAt: record.openedAt } : {}),
    ...(record.confirmedAbsent === true ? { confirmedAbsent: true } : {}),
  };
}

function closeMapFromStored(value: unknown): Record<string, CloseRecord> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const mapped: Record<string, CloseRecord> = {};

  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    const closed = closeRecordFromStored(entry);
    if (closed) {
      mapped[key] = closed;
    }
  }

  return mapped;
}

function bookFromStored(stored: unknown): OpenPathBook {
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) {
    return emptyBook();
  }

  const record = stored as Record<string, unknown>;
  const book: OpenPathBook = isLegacyOpenStateRecord(record)
    ? { opens: { ...(record as OpenPathState) }, recentlyClosed: {} }
    : {
        opens:
          record.opens && typeof record.opens === 'object' && !Array.isArray(record.opens)
            ? ({ ...record.opens } as OpenPathState)
            : {},
        recentlyClosed: closeMapFromStored(record.recentlyClosed),
      };

  canonicalizeBook(book);

  return book;
}

/** Prefer the book that knows more active opens / newer close cooldowns. */
function mergeBooks(a: OpenPathBook, b: OpenPathBook): OpenPathBook {
  const opens: OpenPathState = { ...a.opens, ...b.opens };
  const recentlyClosed: Record<string, CloseRecord> = { ...a.recentlyClosed };

  for (const [key, closed] of Object.entries(b.recentlyClosed)) {
    const existing = recentlyClosed[key];
    if (!existing || new Date(closed.closedAt).getTime() > new Date(existing.closedAt).getTime()) {
      recentlyClosed[key] = closed;
    }
  }

  return { opens, recentlyClosed };
}

async function readBookFromDisk(): Promise<OpenPathBook> {
  const stored = await getRuntimeSnapshot(OPEN_PATHS_KEY).catch(() => null);
  return bookFromStored(stored);
}

async function readBook(): Promise<OpenPathBook> {
  const disk = await readBookFromDisk();
  if (!memoryBook) {
    memoryBook = cloneBook(disk);
    canonicalizeBook(memoryBook);
    return cloneBook(memoryBook);
  }

  const merged = mergeBooks(memoryBook, disk);
  canonicalizeBook(merged);
  memoryBook = cloneBook(merged);
  return cloneBook(merged);
}

async function writeBook(book: OpenPathBook): Promise<boolean> {
  canonicalizeBook(book);
  memoryBook = cloneBook(book);
  const ok = await saveRuntimeSnapshot(OPEN_PATHS_KEY, book as unknown as Json);
  if (!ok) {
    console.error(
      '[hermes-ledger] Failed to persist open-path book; memory cache retained to block open spam on this instance.',
    );
  }
  return ok;
}

function pruneRecentlyClosed(recentlyClosed: Record<string, CloseRecord>, nowMs: number) {
  let changed = false;

  for (const [key, closed] of Object.entries(recentlyClosed)) {
    const closedMs = new Date(closed.closedAt).getTime();

    if (!Number.isFinite(closedMs) || nowMs - closedMs > RECENTLY_CLOSED_TTL_MS) {
      delete recentlyClosed[key];
      changed = true;
    }
  }

  return changed;
}

function markConfirmedAbsences(book: OpenPathBook, liveKeys: Set<string>) {
  let changed = false;

  for (const [key, closed] of Object.entries(book.recentlyClosed)) {
    if (!liveKeys.has(key) && !closed.confirmedAbsent) {
      book.recentlyClosed[key] = { ...closed, confirmedAbsent: true };
      changed = true;
    }
  }

  return changed;
}

/** Lagging mark of the same closed path, not a genuine new open. */
function shouldSuppressOpen(
  recentlyClosed: Record<string, CloseRecord>,
  key: string,
  incoming: Pick<LivePosition, 'openedAt' | 'positionId'>,
  nowMs: number,
) {
  const closed = recentlyClosed[key];

  if (!closed) {
    return false;
  }

  const closedMs = new Date(closed.closedAt).getTime();

  if (!Number.isFinite(closedMs) || nowMs - closedMs > RECENTLY_CLOSED_TTL_MS) {
    return false;
  }

  // A later mark already showed this path gone. Reappearance is a new path.
  if (closed.confirmedAbsent) {
    return false;
  }

  if (incoming.positionId && closed.positionId && incoming.positionId !== closed.positionId) {
    return false;
  }

  if (incoming.openedAt) {
    const openedMs = new Date(incoming.openedAt).getTime();

    if (Number.isFinite(openedMs) && openedMs > closedMs) {
      return false;
    }

    if (closed.openedAt && incoming.openedAt !== closed.openedAt) {
      return false;
    }
  }

  return true;
}

// Serialize open/close book mutations on this instance (concurrent mark posts).
let bookChain: Promise<void> = Promise.resolve();

function withBookLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = bookChain.then(fn, fn);
  bookChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function nextHermesRecordId(rows: Array<{ recordId: string }>) {
  const nextRecordNumber =
    rows.reduce((max, row) => {
      const match = row.recordId.match(/^HMS-(\d+)$/);

      return match ? Math.max(max, Number(match[1])) : max;
    }, 0) + 1;

  return `HMS-${String(nextRecordNumber).padStart(3, '0')}`;
}

function livePathKeys(positions: LivePosition[]) {
  const keys: string[] = [];
  const byKey = new Map<string, LivePosition>();

  for (const position of positions) {
    const key = pathKey(position.symbol, position.side);

    if (byKey.has(key)) {
      continue;
    }

    byKey.set(key, position);
    keys.push(key);
  }

  return { byKey, keys };
}

function adoptUnpairedOpen(
  book: OpenPathBook,
  key: string,
  unpaired: Array<{ recordId: string; sealedAt: string }>,
) {
  const claimed = new Set(
    Object.values(book.opens)
      .map((entry) => entry.recordId)
      .filter(Boolean),
  );
  const existing = unpaired.find((row) => !claimed.has(row.recordId));

  if (!existing) {
    return false;
  }

  book.opens[key] = { openedAt: existing.sealedAt, recordId: existing.recordId };

  return true;
}

/**
 * Called from the pool-mark ingest after a healthy mark stores. Seals an
 * open row for every position not already tracked. Positions that vanish
 * are NOT closed here, close rows come only from the trade-events feed.
 */
export async function trackOpenPathsFromMark(rawPayload: unknown, effectiveAt?: string) {
  return withBookLock(async () => {
    try {
      const positions = parsePublicPositions(rawPayload);

      // A degraded mark (positions_source: error) reports no positions; never
      // treat that as "everything closed", and never seal opens from it.
      const payload = rawPayload as Record<string, unknown> | null;

      if (!positions.length || payload?.positions_source === 'error') {
        return;
      }

      // Fresh merge of memory + disk under the lock.
      const book = await readBook();
      const nowMs = Date.now();
      let changed = pruneRecentlyClosed(book.recentlyClosed, nowMs);

      // Do NOT drop opens when a mark omits a symbol. Only popOpenPathRef
      // (trade close) removes tracking, prevents unpaired opens + re-spam.

      const { byKey, keys: liveKeys } = livePathKeys(positions);
      changed = markConfirmedAbsences(book, new Set(liveKeys)) || changed;
      const untracked = liveKeys.filter((key) => {
        if (book.opens[key]) {
          return false;
        }

        return !shouldSuppressOpen(book.recentlyClosed, key, byKey.get(key) ?? {}, nowMs);
      });

      if (!untracked.length) {
        if (changed) {
          await writeBook(book);
        }

        return;
      }

      const unpaired = await listUnpairedHermesOpenRows();
      const liveMapped = liveKeys.some((key) => Boolean(book.opens[key]));
      const justClosed = Object.keys(book.recentlyClosed).length > 0;
      // Adopt leftover unpaired opens only after a lost tracking book
      // (restart). A real close + new path must mint a new row.
      const bookLooksLost = !liveMapped && !justClosed;
      const neededSeals = bookLooksLost ? Math.max(0, liveKeys.length - unpaired.length) : untracked.length;
      const adoptCount = Math.max(0, untracked.length - neededSeals);
      const sealKeys: string[] = [];

      for (const [index, key] of untracked.entries()) {
        if (index < adoptCount && adoptUnpairedOpen(book, key, unpaired)) {
          changed = true;
          continue;
        }

        sealKeys.push(key);
      }

      if (changed) {
        await writeBook(book);
        changed = false;
      }

      const snapshot = sealKeys.length ? await getStoredHermesBriefSnapshot().catch(() => null) : null;

      for (const key of sealKeys) {
        const incoming: Pick<LivePosition, 'openedAt' | 'positionId'> = byKey.get(key) ?? {};
        if (book.opens[key] || shouldSuppressOpen(book.recentlyClosed, key, incoming, nowMs)) {
          continue;
        }

        // Re-check disk immediately before seal (cross-instance race).
        const latest = await readBookFromDisk();
        const merged = mergeBooks(book, latest);
        canonicalizeBook(merged);
        book.opens = merged.opens;
        book.recentlyClosed = merged.recentlyClosed;
        memoryBook = cloneBook(book);

        if (book.opens[key] || shouldSuppressOpen(book.recentlyClosed, key, incoming, nowMs)) {
          continue;
        }

        // Another instance may have sealed while this one had an empty book.
        // Never adopt leftover unpaired rows after a real close.
        const latestUnpaired = await listUnpairedHermesOpenRows();
        const stillLost = !liveKeys.some((liveKey) => Boolean(book.opens[liveKey])) && Object.keys(book.recentlyClosed).length === 0;
        if (stillLost && latestUnpaired.length >= liveKeys.length) {
          if (adoptUnpairedOpen(book, key, latestUnpaired)) {
            changed = true;
            await writeBook(book);
          }
          continue;
        }

        const existing = await listHermesLedgerRows(1000);
        const recordId = nextHermesRecordId(existing);
        const sealedAt = effectiveAt ?? new Date().toISOString();
        const row = await sealHermesLedgerRow({
          decision: 'Opened a path: instrument private until close',
          eventType: 'open',
          note: '',
          posture: snapshot && snapshot.brief_id !== 'fallback' ? snapshot.posture : 'DEPLOYED',
          recordId,
          sealedAt,
        });

        if (row) {
          book.opens[key] = {
            openedAt: sealedAt,
            recordId: row.recordId,
            ...(incoming.positionId ? { positionId: incoming.positionId } : {}),
            ...(incoming.openedAt ? { exchangeOpenedAt: incoming.openedAt } : {}),
          };
          changed = true;
          // Persist immediately so the next mark (or concurrent request after
          // this write) sees the open and does not spam another seal.
          await writeBook(book);
        }
      }

      if (changed) {
        // Final write if only cooldown pruning changed.
        await writeBook(book);
      }
    } catch (error) {
      console.warn('[hermes-ledger] Open path tracking failed.', error);
    }
  });
}

/**
 * Open paths currently tracked by Hermes, for simulation participation.
 * Paths sealed before a guest's sim start must not be treated as their opens.
 */
export async function listTrackedOpenPaths(): Promise<Array<{ openedAt: string; recordId: string; key: string }>> {
  try {
    const book = await readBook();
    return Object.entries(book.opens).map(([key, entry]) => ({
      key,
      openedAt: entry.openedAt,
      recordId: entry.recordId,
    }));
  } catch (error) {
    console.warn('[hermes-ledger] Open path list failed.', error);
    return [];
  }
}

/**
 * Called from the trade-events ingest when a close seals: returns (and
 * consumes) the open row's record id for the `ref` field.
 *
 * Arms a cooldown so lagging marks that still list the symbol cannot
 * immediately re-seal a new open for the same path.
 */
export async function popOpenPathRef(symbol: string, side: string): Promise<string | null> {
  return withBookLock(async () => {
    try {
      const book = await readBook();
      const key = pathKey(symbol, side);
      const entry = book.opens[key];
      const closedAt = new Date().toISOString();

      // Always record the close cooldown, even if we lacked an open entry
      // (pre-schema or state loss), still blocks ghost re-opens from stale marks.
      book.recentlyClosed[key] = {
        closedAt,
        ...(entry?.positionId ? { positionId: entry.positionId } : {}),
        ...(entry?.exchangeOpenedAt ? { openedAt: entry.exchangeOpenedAt } : {}),
      };
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
  });
}
