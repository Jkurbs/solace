#!/usr/bin/env node
// Verify the Hermes decision ledger hash chain.
//
//   node scripts/verify-ledger.mjs [url]
//
// Defaults to the live ledger. Recomputes every row's hash from its public
// fields and walks the chain; any edited, reordered, or removed historical
// row makes verification fail. Compare the printed chain head against an
// externally anchored copy (git history, X posts) to confirm the whole
// record predates the anchor.
import { createHash } from 'node:crypto';

const url = process.argv[2] ?? 'https://www.solace.fyi/api/hermes/decision-ledger';

const sha256 = (value) => createHash('sha256').update(value, 'utf8').digest('hex');
const iso = (value) => new Date(value).toISOString();

const response = await fetch(url);

if (!response.ok) {
  console.error(`Fetch failed: ${response.status} ${response.statusText}`);
  process.exit(2);
}

const { chain, rows } = await response.json();
let prevHash = chain?.genesisPrevHash ?? 'GENESIS';
let failures = 0;

for (const row of rows) {
  const expectedRowHash = sha256(
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
    console.log(`~ ${row.recordId}: no hash yet (sealed before the chain existed)`);
    prevHash = expectedRowHash;
    continue;
  }

  if (row.prevHash !== prevHash) {
    console.error(`✗ ${row.recordId}: prev_hash mismatch (chain broken or rows reordered)`);
    failures += 1;
  }

  if (row.rowHash !== expectedRowHash) {
    console.error(`✗ ${row.recordId}: row_hash mismatch (sealed fields were altered)`);
    failures += 1;
  } else {
    console.log(`✓ ${row.recordId}: sealed ${iso(row.sealedAt)}`);
  }

  if (row.outcome !== null && row.resolutionHash) {
    const expectedResolutionHash = sha256(
      JSON.stringify({
        outcome: row.outcome,
        pnl: row.pnl === null ? null : Number(row.pnl).toFixed(2),
        resolved_at: iso(row.resolvedAt),
        row_hash: row.rowHash,
      }),
    );

    if (row.resolutionHash !== expectedResolutionHash) {
      console.error(`✗ ${row.recordId}: resolution_hash mismatch (outcome or PnL was altered)`);
      failures += 1;
    }
  }

  prevHash = row.rowHash;
}

console.log('');
console.log(`Rows: ${rows.length} · Chain head: ${prevHash}`);

if (failures > 0) {
  console.error(`FAILED: ${failures} integrity error(s).`);
  process.exit(1);
}

console.log('OK: chain verifies. Compare the chain head against an anchored copy.');
