#!/usr/bin/env node
// Verify the Hermes decision ledger hash chain.
//
//   node scripts/verify-ledger.mjs [url]
//
// NOTE: a copy of this script is published at public/verify-ledger.mjs
// (served at solace.fyi/verify-ledger.mjs) — keep the two in sync.
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

const { chain, meta, rows } = await response.json();
let prevHash = chain?.genesisPrevHash ?? 'GENESIS';
let failures = 0;
const classCounts = { backfill: 0, sealed: 0, system: 0, unclassified: 0 };
const versionCounts = new Map();
const openRows = new Map();
const voidedOpens = new Set();

for (const row of rows) {
  classCounts[row.rowClass ?? 'unclassified'] = (classCounts[row.rowClass ?? 'unclassified'] ?? 0) + 1;
  const versionKey = row.hermesVersion ?? 'unversioned';
  versionCounts.set(versionKey, (versionCounts.get(versionKey) ?? 0) + 1);

  // Open/close pairing: every close ref must resolve to an open row that
  // precedes it; unpaired opens must be live (or voided). Closes without a
  // ref predate the two-row schema and are reported, not failed.
  if (row.eventType === 'open') {
    openRows.set(row.recordId, row);
  }

  if ((row.eventType === 'close' || row.eventType === 'void') && row.ref) {
    if (!openRows.has(row.ref)) {
      console.error(`✗ ${row.recordId}: ref ${row.ref} does not match any earlier open row`);
      failures += 1;
    } else if (row.eventType === 'void') {
      voidedOpens.add(row.ref);
    } else {
      openRows.delete(row.ref);
    }
  }

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

const unresolvedOpens = [...openRows.keys()].filter((id) => !voidedOpens.has(id));

console.log('');
console.log(
  `Rows: ${rows.length} · sealed ${classCounts.sealed} · backfill ${classCounts.backfill} (labeled) · system ${classCounts.system}${classCounts.unclassified ? ` · unclassified ${classCounts.unclassified}` : ''}`,
);

if (meta?.hermesVersion?.label || meta?.hermesVersion?.id) {
  console.log(
    `Running Hermes: ${meta.hermesVersion.label ?? meta.hermesVersion.id}${meta.hermesVersion.id ? ` (${meta.hermesVersion.id})` : ''}`,
  );
}

const versionSummary = [...versionCounts.entries()]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([version, count]) => `${version}×${count}`)
  .join(' · ');

if (versionSummary) {
  console.log(`Row versions: ${versionSummary}`);
}

if (unresolvedOpens.length) {
  console.log(`Open paths without a close: ${unresolvedOpens.join(', ')} (live or awaiting close)`);
}

console.log(`Chain head: ${prevHash}`);

if (failures > 0) {
  console.error(`FAILED: ${failures} integrity error(s).`);
  process.exit(1);
}

console.log('OK: chain verifies. Compare the chain head against an anchored copy.');
