import 'server-only';

import { createSupabaseDataClient, isSupabaseDataClientConfigured } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/types';

export type HermesLedgerRow = {
  recordId: string;
  sealedAt: string;
  decision: string;
  posture: string;
  note: string;
  outcome: string | null;
  pnl: number | null;
  resolvedAt: string | null;
};

type LedgerRowRecord = Database['public']['Tables']['hermes_decision_ledger']['Row'];

function isMissingLedgerTable(message: string) {
  return (
    message.includes('hermes_decision_ledger') &&
    (message.includes('Could not find') || message.includes('does not exist') || message.includes('schema cache'))
  );
}

function fromRow(row: LedgerRowRecord): HermesLedgerRow {
  return {
    decision: row.decision,
    note: row.note,
    outcome: row.outcome,
    pnl: row.pnl === null ? null : Math.round(row.pnl * 100) / 100,
    posture: row.posture,
    recordId: row.record_id,
    resolvedAt: row.resolved_at,
    sealedAt: row.sealed_at,
  };
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
      .order('sealed_at', { ascending: true })
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

export async function sealHermesLedgerRow(input: {
  recordId: string;
  sealedAt?: string;
  decision: string;
  posture: string;
  note?: string;
}): Promise<HermesLedgerRow | null> {
  if (!isSupabaseDataClientConfigured()) {
    return null;
  }

  try {
    const supabase = await createSupabaseDataClient();
    const { data, error } = await supabase
      .from('hermes_decision_ledger')
      .insert({
        decision: input.decision,
        note: input.note ?? '',
        posture: input.posture,
        record_id: input.recordId,
        sealed_at: input.sealedAt ?? new Date().toISOString(),
      })
      .select('*')
      .maybeSingle();

    if (error) {
      // Duplicate record id: sealing is idempotent — return the existing row.
      if (error.code === '23505') {
        const existing = await supabase
          .from('hermes_decision_ledger')
          .select('*')
          .eq('record_id', input.recordId)
          .maybeSingle();

        return existing.data ? fromRow(existing.data) : null;
      }

      if (!isMissingLedgerTable(error.message)) {
        console.warn('[hermes-ledger] Seal failed.', error.message);
      }

      return null;
    }

    return data ? fromRow(data) : null;
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
    const { data, error } = await supabase
      .from('hermes_decision_ledger')
      .update({
        outcome: input.outcome,
        pnl: input.pnl ?? null,
        resolved_at: input.resolvedAt ?? new Date().toISOString(),
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
