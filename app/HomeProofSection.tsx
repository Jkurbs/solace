'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';

import type { HermesLedgerRow } from '@/features/hermes-ledger/store';
import { OBSERVATORY_HERMES_LEDGER_PATH } from '@/features/observatory/paths';

const sealedAtFormatter = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  hour: 'numeric',
  hour12: false,
  minute: '2-digit',
  month: 'short',
  timeZone: 'UTC',
  year: 'numeric',
});

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Same canonical payload as features/hermes-ledger/hash.ts and verify-ledger.mjs. */
async function computeRowHash(row: {
  decision: string;
  note: string;
  posture: string;
  prevHash: string;
  recordId: string;
  sealedAt: string;
}) {
  return sha256Hex(
    JSON.stringify({
      decision: row.decision,
      note: row.note,
      posture: row.posture,
      prev_hash: row.prevHash,
      record_id: row.recordId,
      sealed_at: new Date(row.sealedAt).toISOString(),
    }),
  );
}

function pickProofRow(rows: HermesLedgerRow[]) {
  return [...rows].reverse().find((row) => Boolean(row.rowHash && row.prevHash)) ?? null;
}

export function HomeProofSection({
  rows,
  sealedDecisions = null,
}: {
  rows: HermesLedgerRow[];
  sealedDecisions?: number | null;
}) {
  const row = pickProofRow(rows);
  const fieldId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState(row?.decision ?? '');
  const [liveHash, setLiveHash] = useState(row?.rowHash ?? '');

  useEffect(() => {
    setDraft(row?.decision ?? '');
    setLiveHash(row?.rowHash ?? '');
  }, [row?.decision, row?.rowHash, row?.recordId]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [draft]);

  useEffect(() => {
    if (!row?.prevHash || !row.rowHash) return undefined;

    let cancelled = false;
    void computeRowHash({
      decision: draft,
      note: row.note,
      posture: row.posture,
      prevHash: row.prevHash,
      recordId: row.recordId,
      sealedAt: row.sealedAt,
    }).then((hash) => {
      if (!cancelled) setLiveHash(hash);
    });

    return () => {
      cancelled = true;
    };
  }, [draft, row]);

  if (!row) {
    return null;
  }

  const wet = draft !== row.decision;
  const hash = (wet ? liveHash : row.rowHash) || row.rowHash || '';
  const sealedLabel = Number.isNaN(new Date(row.sealedAt).getTime())
    ? row.sealedAt
    : `${sealedAtFormatter.format(new Date(row.sealedAt))} UTC`;

  return (
    <section className={`home-proof${wet ? ' is-wet' : ''}`}>
      <div className="home-proof-inner">
        <p className="home-proof-dare">
          Each decision is written before the outcome is known, so it cannot be changed after the fact.
          Change a word.
        </p>

        <div className="home-proof-line">
          <p className="home-proof-dry" aria-hidden="true">
            {row.decision}
          </p>
          <label htmlFor={fieldId} className="sr-only">
            Sealed decision. Editing does not change the public row.
          </label>
          <textarea
            id={fieldId}
            ref={textareaRef}
            className="home-proof-wet"
            value={draft}
            rows={1}
            spellCheck={false}
            onChange={(event) => setDraft(event.target.value)}
          />
        </div>

        <p className="home-proof-meta">
          {row.recordId}
          <span aria-hidden="true"> · </span>
          {sealedLabel}
          {typeof sealedDecisions === 'number' && sealedDecisions > 0 ? (
            <>
              <span aria-hidden="true"> · </span>
              {sealedDecisions.toLocaleString('en-US')} sealed
            </>
          ) : null}
        </p>

        <p className="home-proof-hash" aria-label="Row hash">
          {hash}
        </p>

        <div className="home-proof-foot">
          <p className="home-proof-verdict" aria-live="polite">
            {wet ? 'What you typed is not on the chain. This is.' : ''}
          </p>
          <div className="home-proof-actions">
            {wet ? (
              <button type="button" className="home-proof-restore" onClick={() => setDraft(row.decision)}>
                Restore
              </button>
            ) : null}
            <Link href={OBSERVATORY_HERMES_LEDGER_PATH} className="home-proof-link">
              Open the public record <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
