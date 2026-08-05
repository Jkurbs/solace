'use client';

import type { TrustLedgerDisplayRow } from './TrustLedgerTable';

function sealClaim(row: TrustLedgerDisplayRow): { label: string; tone: 'ok' | 'warn' | 'muted' } {
  if (row.rowClass === 'backfill') {
    return { label: 'Backfill — no sealed-before-outcome claim', tone: 'warn' };
  }
  if (row.rowClass === 'system') {
    return { label: 'System row — operational, not a path decision', tone: 'muted' };
  }
  if (!row.rowHash) {
    return { label: 'Hash pending or unavailable on this row', tone: 'muted' };
  }
  if (row.outcome && row.outcome !== '--' && row.outcome !== 'Open') {
    return { label: 'Sealed before outcome · later resolved', tone: 'ok' };
  }
  if (row.eventType === 'open' || row.outcome === 'Open') {
    return { label: 'Sealed open path · outcome not yet resolved', tone: 'ok' };
  }
  return { label: 'Sealed decision', tone: 'ok' };
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="ledger-row-detail-field">
      <dt>{label}</dt>
      <dd className={mono ? 'is-mono' : undefined}>{value || '—'}</dd>
    </div>
  );
}

/**
 * Row expand: only fields that already exist on the public chain.
 * Emotional job: I can see what was sealed, and how it links — without reconstruction theater.
 */
export default function LedgerRowDetail({
  row,
  onClose,
}: {
  row: TrustLedgerDisplayRow;
  onClose: () => void;
}) {
  const claim = sealClaim(row);

  return (
    <div className="ledger-row-detail" role="region" aria-label={`Decision ${row.recordId}`}>
      <div className="ledger-row-detail-head">
        <div>
          <p className="ledger-row-detail-kicker">Sealed row · #{row.row}</p>
          <h3 className="ledger-row-detail-title">{row.decision}</h3>
          <p className={`ledger-row-detail-claim is-${claim.tone}`}>{claim.label}</p>
        </div>
        <button type="button" className="ledger-row-detail-close" onClick={onClose}>
          Close
        </button>
      </div>

      <dl className="ledger-row-detail-grid">
        <Field label="Sealed at" value={row.sealedAt} />
        <Field label="Record id" value={row.recordId} mono />
        <Field label="Posture" value={row.posture} />
        <Field label="Outcome" value={row.outcome} />
        <Field label="PnL" value={row.pnl} />
        <Field label="Event" value={row.eventType ?? '—'} mono />
        <Field label="Ref (open pairing)" value={row.ref ?? '—'} mono />
        <Field label="Hermes version" value={row.hermesVersion ? `v${row.hermesVersion}` : '—'} mono />
        <Field label="Note" value={row.note === '--' ? '—' : row.note} />
      </dl>

      <div className="ledger-row-detail-hashes">
        <p className="ledger-row-detail-hashes-kicker">Chain links</p>
        <dl>
          <div>
            <dt>Previous hash</dt>
            <dd className="is-mono">{row.prevHash ?? '—'}</dd>
          </div>
          <div>
            <dt>Row hash</dt>
            <dd className="is-mono">{row.rowHash ?? '—'}</dd>
          </div>
          <div>
            <dt>Resolution hash</dt>
            <dd className="is-mono">{row.resolutionHash ?? '—'}</dd>
          </div>
        </dl>
        <p className="ledger-row-detail-hashes-note">
          Row hash covers decision, posture, note, record id, sealed time, and previous hash. Resolution hash covers
          outcome and PnL after close. Run <a href="#verify-ledger">Verify this chain</a> to recompute every link.
        </p>
      </div>
    </div>
  );
}
