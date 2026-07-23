import 'server-only';

import { hermesVersion } from '@/features/hermes-version';
import { createSupabaseDataClient, isSupabaseDataClientConfigured } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/types';

import { computeLedgerResolutionHash, computeLedgerRowHash, LEDGER_GENESIS_PREV_HASH } from './hash';

export type HermesLedgerRowClass = 'sealed' | 'backfill' | 'system';
export type HermesLedgerEventType = 'open' | 'close' | 'void';

export type HermesLedgerRow = {
  recordId: string;
  sealedAt: string;
  decision: string;
  posture: string;
  note: string;
  outcome: string | null;
  pnl: number | null;
  resolvedAt: string | null;
  prevHash: string | null;
  rowHash: string | null;
  resolutionHash: string | null;
  rowClass: HermesLedgerRowClass | null;
  eventType: HermesLedgerEventType | null;
  ref: string | null;
  /** Agent id at seal time (e.g. '0.2.0'). Null for rows sealed before V4. */
  hermesVersion: string | null;
};

type LedgerRowRecord = Database['public']['Tables']['hermes_decision_ledger']['Row'];
type SupabaseClient = Awaited<ReturnType<typeof createSupabaseDataClient>>;

function isMissingLedgerTable(message: string) {
  // A missing COLUMN (migration not yet run) must never be treated as a
  // missing table — that would silently drop rows. Only the table itself
  // being absent is tolerable.
  if (message.includes('column')) {
    return false;
  }

  return (
    message.includes('hermes_decision_ledger') &&
    (message.includes('Could not find') || message.includes('does not exist') || message.includes('schema cache'))
  );
}

function fromRow(row: LedgerRowRecord): HermesLedgerRow {
  return {
    decision: row.decision,
    eventType: (row.event_type as HermesLedgerEventType | null) ?? null,
    hermesVersion: row.hermes_version ?? null,
    note: row.note,
    outcome: row.outcome,
    pnl: row.pnl === null ? null : Math.round(row.pnl * 100) / 100,
    posture: row.posture,
    prevHash: row.prev_hash,
    recordId: row.record_id,
    ref: row.ref,
    resolutionHash: row.resolution_hash,
    resolvedAt: row.resolved_at,
    rowClass: (row.row_class as HermesLedgerRowClass | null) ?? null,
    rowHash: row.row_hash,
    sealedAt: row.sealed_at,
  };
}

// Rows sealed before the chain existed (or before the V2 migration ran) get
// their hashes computed in original order. Write-once: the trigger allows
// setting a null hash field exactly once.
async function ensureLedgerHashBackfill(supabase: SupabaseClient): Promise<string> {
  const { data, error } = await supabase
    .from('hermes_decision_ledger')
    .select('*')
    .order('created_at', { ascending: true });

  if (error || !data?.length) {
    return LEDGER_GENESIS_PREV_HASH;
  }

  let prevHash = LEDGER_GENESIS_PREV_HASH;

  for (const row of data) {
    let rowHash = row.row_hash;

    if (!rowHash) {
      rowHash = computeLedgerRowHash({
        decision: row.decision,
        note: row.note,
        posture: row.posture,
        prevHash,
        recordId: row.record_id,
        sealedAt: row.sealed_at,
      });

      const { error: updateError } = await supabase
        .from('hermes_decision_ledger')
        .update({ prev_hash: prevHash, row_hash: rowHash })
        .eq('record_id', row.record_id)
        .is('row_hash', null);

      if (updateError) {
        console.warn('[hermes-ledger] Hash backfill failed.', updateError.message);
        return LEDGER_GENESIS_PREV_HASH;
      }
    }

    if (row.outcome !== null && row.resolved_at && !row.resolution_hash) {
      const resolutionHash = computeLedgerResolutionHash({
        outcome: row.outcome,
        pnl: row.pnl,
        resolvedAt: row.resolved_at,
        rowHash,
      });

      const { error: resolutionError } = await supabase
        .from('hermes_decision_ledger')
        .update({ resolution_hash: resolutionHash })
        .eq('record_id', row.record_id)
        .is('resolution_hash', null);

      if (resolutionError) {
        console.warn('[hermes-ledger] Resolution hash backfill failed.', resolutionError.message);
      }
    }

    prevHash = rowHash;
  }

  return prevHash;
}

// Lightweight change-detection read for the public pulse endpoint: two
// cheap queries instead of the full table.
export async function getHermesLedgerPulse(): Promise<{
  rowCount: number;
  latestRecordId: string | null;
  chainHead: string | null;
} | null> {
  if (!isSupabaseDataClientConfigured()) {
    return null;
  }

  try {
    const supabase = await createSupabaseDataClient();
    const [countResult, latestResult] = await Promise.all([
      supabase.from('hermes_decision_ledger').select('record_id', { count: 'exact', head: true }),
      supabase
        .from('hermes_decision_ledger')
        .select('record_id,row_hash')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (countResult.error) {
      return null;
    }

    return {
      chainHead: latestResult.data?.row_hash ?? null,
      latestRecordId: latestResult.data?.record_id ?? null,
      rowCount: countResult.count ?? 0,
    };
  } catch (error) {
    console.warn('[hermes-ledger] Pulse read failed.', error);
    return null;
  }
}

export async function listHermesLedgerRows(limit = 50): Promise<HermesLedgerRow[]> {
  if (!isSupabaseDataClientConfigured()) {
    return [];
  }

  try {
    const supabase = await createSupabaseDataClient();
    const { data, error } = await supabase
      .from('hermes_decision_ledger')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      if (!isMissingLedgerTable(error.message)) {
        console.warn('[hermes-ledger] List failed.', error.message);
      }

      return [];
    }

    return (data ?? []).map(fromRow);
  } catch (error) {
    console.warn('[hermes-ledger] List failed.', error);
    return [];
  }
}

/**
 * Lean ledger read for homepage vault metrics. Selects only the columns the
 * process scoreboard needs — much cheaper than listHermesLedgerRows(1000) with `*`.
 */
export async function listHermesLedgerProcessRows(limit = 1500): Promise<HermesLedgerRow[]> {
  if (!isSupabaseDataClientConfigured()) {
    return [];
  }

  try {
    const supabase = await createSupabaseDataClient();
    const { data, error } = await supabase
      .from('hermes_decision_ledger')
      .select(
        'record_id, sealed_at, decision, posture, note, outcome, pnl, resolved_at, row_class, event_type, ref',
      )
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      if (!isMissingLedgerTable(error.message)) {
        console.warn('[hermes-ledger] Process list failed.', error.message);
      }

      return [];
    }

    return (data ?? []).map((row) => ({
      decision: row.decision,
      eventType: (row.event_type as HermesLedgerEventType | null) ?? null,
      hermesVersion: null,
      note: row.note,
      outcome: row.outcome,
      pnl: row.pnl === null || row.pnl === undefined ? null : Math.round(Number(row.pnl) * 100) / 100,
      posture: row.posture,
      prevHash: null,
      recordId: row.record_id,
      ref: row.ref,
      resolutionHash: null,
      resolvedAt: row.resolved_at,
      rowClass: (row.row_class as HermesLedgerRowClass | null) ?? null,
      rowHash: null,
      sealedAt: row.sealed_at,
    }));
  } catch (error) {
    console.warn('[hermes-ledger] Process list failed.', error);
    return [];
  }
}

export async function sealHermesLedgerRow(input: {
  recordId: string;
  sealedAt?: string;
  decision: string;
  posture: string;
  note?: string;
  /**
   * For decisions whose outcome is known the moment they are made (a closed
   * trade's realized PnL), the row may be sealed already-resolved. This is an
   * INSERT — the trigger still forbids any later edit.
   */
  outcome?: string;
  pnl?: number | null;
  resolvedAt?: string;
  /**
   * 'sealed' (default) or 'system'. 'backfill' is deliberately NOT
   * assignable: it exists only for the one-time labeling of rows recorded
   * at the July 2026 rebuild, applied by migration. Enforced here, not by
   * convention.
   */
  rowClass?: 'sealed' | 'system';
  eventType?: HermesLedgerEventType;
  /** For close/void rows: the record_id of the open row they resolve. */
  ref?: string;
  /**
   * Agent id at seal time. Defaults to the running product version.
   * Unhashed write-once metadata (V4) — does not affect the chain.
   */
  hermesVersion?: string;
}): Promise<HermesLedgerRow | null> {
  if (!isSupabaseDataClientConfigured()) {
    return null;
  }

  if ((input.rowClass as string) === 'backfill') {
    console.warn('[hermes-ledger] backfill rows cannot be created; refusing seal.');
    return null;
  }

  try {
    const supabase = await createSupabaseDataClient();
    const sealedAt = input.sealedAt ?? new Date().toISOString();
    const note = input.note ?? '';
    const stampedVersion = (input.hermesVersion ?? hermesVersion.id).trim().slice(0, 32) || hermesVersion.id;

    // Two attempts: a concurrent seal grabbing the same chain tip trips the
    // prev_hash unique index; refetch the tip and retry once.
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const prevHash = await ensureLedgerHashBackfill(supabase);
      const rowHash = computeLedgerRowHash({
        decision: input.decision,
        note,
        posture: input.posture,
        prevHash,
        recordId: input.recordId,
        sealedAt,
      });
      const resolvedAt = input.outcome ? (input.resolvedAt ?? new Date().toISOString()) : null;
      const pnl = input.outcome ? (input.pnl ?? null) : null;
      const { data, error } = await supabase
        .from('hermes_decision_ledger')
        .insert({
          decision: input.decision,
          event_type: input.eventType ?? null,
          hermes_version: stampedVersion,
          note,
          outcome: input.outcome ?? null,
          pnl,
          posture: input.posture,
          prev_hash: prevHash,
          record_id: input.recordId,
          resolution_hash:
            input.outcome && resolvedAt
              ? computeLedgerResolutionHash({ outcome: input.outcome, pnl, resolvedAt, rowHash })
              : null,
          ref: input.ref ?? null,
          resolved_at: resolvedAt,
          row_class: input.rowClass ?? 'sealed',
          row_hash: rowHash,
          sealed_at: sealedAt,
        })
        .select('*')
        .maybeSingle();

      if (!error) {
        return data ? fromRow(data) : null;
      }

      if (error.code === '23505') {
        // Duplicate record id: sealing is idempotent — return the existing row.
        if (error.message.includes('pkey') || error.message.includes('record_id')) {
          const existing = await supabase
            .from('hermes_decision_ledger')
            .select('*')
            .eq('record_id', input.recordId)
            .maybeSingle();

          return existing.data ? fromRow(existing.data) : null;
        }

        // Chain-tip race: another seal landed first. Retry with the new tip.
        continue;
      }

      if (!isMissingLedgerTable(error.message)) {
        console.warn('[hermes-ledger] Seal failed.', error.message);
      }

      return null;
    }

    console.warn('[hermes-ledger] Seal failed after chain-tip retries.');
    return null;
  } catch (error) {
    console.warn('[hermes-ledger] Seal failed.', error);
    return null;
  }
}

export async function resolveHermesLedgerRow(input: {
  recordId: string;
  outcome: string;
  pnl?: number | null;
  resolvedAt?: string;
}): Promise<HermesLedgerRow | null> {
  if (!isSupabaseDataClientConfigured()) {
    return null;
  }

  try {
    const supabase = await createSupabaseDataClient();
    const { data: existing } = await supabase
      .from('hermes_decision_ledger')
      .select('row_hash')
      .eq('record_id', input.recordId)
      .is('outcome', null)
      .maybeSingle();
    const resolvedAt = input.resolvedAt ?? new Date().toISOString();
    const pnl = input.pnl ?? null;
    const { data, error } = await supabase
      .from('hermes_decision_ledger')
      .update({
        outcome: input.outcome,
        pnl,
        resolution_hash: existing?.row_hash
          ? computeLedgerResolutionHash({ outcome: input.outcome, pnl, resolvedAt, rowHash: existing.row_hash })
          : null,
        resolved_at: resolvedAt,
        updated_at: new Date().toISOString(),
      })
      .eq('record_id', input.recordId)
      .is('outcome', null)
      .select('*')
      .maybeSingle();

    if (error) {
      if (!isMissingLedgerTable(error.message)) {
        console.warn('[hermes-ledger] Resolve failed.', error.message);
      }

      return null;
    }

    return data ? fromRow(data) : null;
  } catch (error) {
    console.warn('[hermes-ledger] Resolve failed.', error);
    return null;
  }
}
