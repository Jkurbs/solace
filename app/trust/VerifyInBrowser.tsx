'use client';

import { useState } from 'react';

// One-click chain verification running entirely in the visitor's browser via
// Web Crypto — same canonical rules as scripts/verify-ledger.mjs (keep the
// two in sync with features/hermes-ledger/hash.ts). The offline script
// remains the stronger check; this lowers the floor to "anyone with a
// browser", phones included.
type LedgerRow = {
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
  rowClass: string | null;
  eventType: string | null;
  ref: string | null;
};

type Result = {
  rowCount: number;
  sealed: number;
  backfill: number;
  system: number;
  failures: string[];
  chainHead: string;
};

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));

  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

const iso = (value: string) => new Date(value).toISOString();

async function verify(): Promise<Result> {
  const response = await fetch('/api/hermes/decision-ledger', { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`Ledger data unavailable (${response.status}).`);
  }

  const { chain, rows } = (await response.json()) as { chain: { genesisPrevHash: string }; rows: LedgerRow[] };
  let prevHash = chain?.genesisPrevHash ?? 'GENESIS';
  const failures: string[] = [];
  const counts = { backfill: 0, sealed: 0, system: 0 };
  const openRows = new Set<string>();

  for (const row of rows) {
    if (row.rowClass === 'backfill') counts.backfill += 1;
    else if (row.rowClass === 'system') counts.system += 1;
    else counts.sealed += 1;

    if (row.eventType === 'open') {
      openRows.add(row.recordId);
    }

    if ((row.eventType === 'close' || row.eventType === 'void') && row.ref && !openRows.has(row.ref)) {
      failures.push(`${row.recordId}: ref ${row.ref} does not match an earlier open row`);
    }

    const expected = await sha256Hex(
      JSON.stringify({
        decision: row.decision,
        note: row.note,
        posture: row.posture,
        prev_hash: prevHash,
        record_id: row.recordId,
        sealed_at: iso(row.sealedAt),
      }),
    );

    if (row.rowHash == null) {
      prevHash = expected;
      continue;
    }

    if (row.prevHash !== prevHash) {
      failures.push(`${row.recordId}: chain broken (prev hash mismatch)`);
    }

    if (row.rowHash !== expected) {
      failures.push(`${row.recordId}: sealed fields were altered (hash mismatch)`);
    }

    if (row.outcome !== null && row.resolutionHash && row.resolvedAt) {
      const expectedResolution = await sha256Hex(
        JSON.stringify({
          outcome: row.outcome,
          pnl: row.pnl === null ? null : Number(row.pnl).toFixed(2),
          resolved_at: iso(row.resolvedAt),
          row_hash: row.rowHash,
        }),
      );

      if (row.resolutionHash !== expectedResolution) {
        failures.push(`${row.recordId}: outcome or PnL was altered (resolution hash mismatch)`);
      }
    }

    prevHash = row.rowHash;
  }

  return {
    backfill: counts.backfill,
    chainHead: prevHash,
    failures,
    rowCount: rows.length,
    sealed: counts.sealed,
    system: counts.system,
  };
}

export default function VerifyInBrowser() {
  const [state, setState] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState('');

  const run = async () => {
    setState('running');
    setError('');

    try {
      setResult(await verify());
      setState('done');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Verification could not run.');
      setState('error');
    }
  };

  return (
    <div className="trust-verify-run">
      <button type="button" onClick={run} disabled={state === 'running'}>
        {state === 'running' ? 'Recomputing the chain…' : 'Or run the check in your browser'}
      </button>
      {state === 'done' && result ? (
        result.failures.length === 0 ? (
          <p className="trust-verify-ok">
            ✓ {result.rowCount} rows verified on your machine · {result.sealed} sealed ·{' '}
            {result.backfill} backfill (labeled) · {result.system} system
            <span>chain head {result.chainHead.slice(0, 16)}…</span>
          </p>
        ) : (
          <p className="trust-verify-fail">
            ✗ {result.failures.length} integrity error{result.failures.length === 1 ? '' : 's'}:{' '}
            {result.failures.slice(0, 3).join(' · ')}
          </p>
        )
      ) : null}
      {state === 'error' ? <p className="trust-verify-fail">{error}</p> : null}
    </div>
  );
}
