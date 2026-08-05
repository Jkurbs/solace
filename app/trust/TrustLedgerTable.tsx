'use client';

import { useEffect, useMemo, useState } from 'react';

import LedgerRowDetail from './LedgerRowDetail';

export type TrustLedgerDisplayRow = {
  row: string;
  recordId: string;
  sealedAt: string;
  decision: string;
  posture: string;
  outcome: string;
  pnl: string;
  pnlTone: 'pos' | 'neg' | null;
  note: string;
  rowHash: string | null;
  prevHash: string | null;
  resolutionHash: string | null;
  rowClass: string | null;
  eventType: string | null;
  ref: string | null;
  hermesVersion: string | null;
};

const PAGE_SIZE = 20;
const MIN_VISIBLE_ROWS = 7;

export default function TrustLedgerTable({ rows }: { rows: TrustLedgerDisplayRow[] }) {
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const pageIndex = Math.min(page, totalPages - 1);

  useEffect(() => {
    if (page !== pageIndex) {
      setPage(pageIndex);
    }
  }, [page, pageIndex]);

  const pageRows = useMemo(
    () => rows.slice(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE),
    [pageIndex, rows],
  );

  const blankRows = useMemo(() => {
    const filled = pageRows.length;

    return Array.from({ length: Math.max(0, MIN_VISIBLE_ROWS - filled) }, (_, index) =>
      String(pageIndex * PAGE_SIZE + pageRows.length + index + 1),
    );
  }, [pageIndex, pageRows.length]);

  const selectedRow = useMemo(
    () => (selectedId ? rows.find((row) => row.recordId === selectedId) ?? null : null),
    [rows, selectedId],
  );

  const rangeStart = rows.length === 0 ? 0 : pageIndex * PAGE_SIZE + 1;
  const rangeEnd = Math.min(rows.length, (pageIndex + 1) * PAGE_SIZE);
  const showPager = rows.length > PAGE_SIZE;

  const toggleRow = (recordId: string) => {
    if (recordId === 'HMS-000') return;
    setSelectedId((current) => (current === recordId ? null : recordId));
  };

  return (
    <>
      <div className="trust-table-wrap">
        <table className="trust-ledger-table">
          <thead>
            <tr>
              <th className="trust-row-head">#</th>
              <th>Time</th>
              <th>Decision</th>
              <th>Posture</th>
              <th>Outcome</th>
              <th>PnL / DD</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row) => {
              const interactive = row.recordId !== 'HMS-000';
              const selected = selectedId === row.recordId;

              return (
                <tr
                  key={row.recordId}
                  className={[
                    row.rowClass === 'backfill' ? 'trust-row-backfill' : '',
                    row.eventType === 'open' ? 'trust-row-open' : '',
                    selected ? 'trust-row-selected' : '',
                    interactive ? 'trust-row-interactive' : '',
                  ]
                    .filter(Boolean)
                    .join(' ') || undefined}
                  onClick={interactive ? () => toggleRow(row.recordId) : undefined}
                  onKeyDown={
                    interactive
                      ? (event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            toggleRow(row.recordId);
                          }
                        }
                      : undefined
                  }
                  tabIndex={interactive ? 0 : undefined}
                  aria-expanded={interactive ? selected : undefined}
                  aria-label={interactive ? `Open sealed detail for ${row.recordId}` : undefined}
                >
                  <td className="trust-row-number">{row.row}</td>
                  <td>
                    {row.sealedAt}
                    <span className="trust-record-id" title={row.rowHash ?? undefined}>
                      {row.recordId}
                      {row.rowHash ? ` · ${row.rowHash.slice(0, 10)}` : ''}
                      {row.ref ? ` · ref ${row.ref}` : ''}
                    </span>
                    {row.rowClass === 'backfill' ? (
                      <span
                        className="trust-tag"
                        title="Recorded after the outcome was known; does not carry the sealed-first guarantee."
                      >
                        Backfill
                      </span>
                    ) : null}
                    {row.rowClass === 'system' ? <span className="trust-tag">System</span> : null}
                    {row.hermesVersion ? (
                      <span className="trust-tag" title={`Sealed under Hermes v${row.hermesVersion}`}>
                        v{row.hermesVersion}
                      </span>
                    ) : null}
                  </td>
                  <td>{row.decision}</td>
                  <td>{row.posture}</td>
                  <td>{row.outcome}</td>
                  <td className={row.pnlTone ? `trust-pnl-${row.pnlTone}` : undefined}>{row.pnl}</td>
                  <td>{row.note}</td>
                </tr>
              );
            })}
            {blankRows.map((row) => (
              <tr key={`blank-${row}`} className="trust-empty-row">
                <td className="trust-row-number">{row}</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedRow ? (
        <LedgerRowDetail row={selectedRow} onClose={() => setSelectedId(null)} />
      ) : (
        <p className="ledger-table-hint">Click any sealed row to see hashes, pairing, and the seal claim.</p>
      )}

      {showPager ? (
        <div className="trust-pager" aria-label="Ledger pagination">
          <button
            type="button"
            className="trust-pager-btn"
            disabled={pageIndex <= 0}
            onClick={() => setPage((current) => Math.max(0, current - 1))}
          >
            Previous
          </button>
          <p>
            <span>
              {rangeStart}-{rangeEnd} of {rows.length}
            </span>
            <strong>
              Page {pageIndex + 1} of {totalPages}
            </strong>
          </p>
          <button
            type="button"
            className="trust-pager-btn"
            disabled={pageIndex >= totalPages - 1}
            onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))}
          >
            Next
          </button>
        </div>
      ) : null}
    </>
  );
}
