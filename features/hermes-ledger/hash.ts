import { createHash } from 'crypto';

// Canonical hashing for the decision ledger chain. The canonical form must be
// byte-identical however the data round-trips (insert input vs Postgres
// rendering), so timestamps normalize through Date#toISOString and pnl is a
// fixed two-decimal string. scripts/verify-ledger.mjs mirrors these rules —
// change them only together, and never after rows exist.
export const LEDGER_GENESIS_PREV_HASH = 'GENESIS';

function sha256Hex(value: string) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

export function canonicalTimestamp(value: string) {
  return new Date(value).toISOString();
}

export function computeLedgerRowHash(input: {
  recordId: string;
  sealedAt: string;
  decision: string;
  posture: string;
  note: string;
  prevHash: string;
}) {
  return sha256Hex(
    JSON.stringify({
      decision: input.decision,
      note: input.note,
      posture: input.posture,
      prev_hash: input.prevHash,
      record_id: input.recordId,
      sealed_at: canonicalTimestamp(input.sealedAt),
    }),
  );
}

export function computeLedgerResolutionHash(input: {
  rowHash: string;
  outcome: string;
  pnl: number | null;
  resolvedAt: string;
}) {
  return sha256Hex(
    JSON.stringify({
      outcome: input.outcome,
      pnl: input.pnl === null ? null : Number(input.pnl).toFixed(2),
      resolved_at: canonicalTimestamp(input.resolvedAt),
      row_hash: input.rowHash,
    }),
  );
}
