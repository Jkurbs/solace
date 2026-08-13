'use client';

import { useMemo, useState } from 'react';

import type { TrustLedgerDisplayRow } from '@/app/trust/TrustLedgerTable';
import LedgerRowDetail from '@/app/trust/LedgerRowDetail';

const PAGE_SIZE = 20;

export default function RecordTable({
  rows,
  totalSealed,
}: {
  rows: TrustLedgerDisplayRow[];
  totalSealed: number;
}) {
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageIndex = Math.min(page, totalPages - 1);
  const pageRows = useMemo(
    () => rows.slice(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE),
    [pageIndex, rows],
  );
  const selectedRow = selectedId ? rows.find((row) => row.recordId === selectedId) ?? null : null;

  const rangeStart = rows.length === 0 ? 0 : pageIndex * PAGE_SIZE + 1;
  const rangeEnd = Math.min(rows.length, (pageIndex + 1) * PAGE_SIZE);

  return (
    <div className="record-table-block">
      <div className="record-table-wrap">
        <table className="record-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Decision</th>
              <th>Posture</th>
              <th>Outcome</th>
              <th>PnL</th>
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
                    selected ? 'is-selected' : '',
                    interactive ? 'is-interactive' : '',
                    row.rowClass === 'backfill' ? 'is-backfill' : '',
                  ]
                    .filter(Boolean)
                    .join(' ') || undefined}
                  onClick={
                    interactive
                      ? () => setSelectedId((current) => (current === row.recordId ? null : row.recordId))
                      : undefined
                  }
                >
                  <td className="record-table-time">
                    <time>{row.sealedAt}</time>
                    {row.rowClass === 'backfill' ? <span className="record-table-tag">Backfill</span> : null}
                  </td>
                  <td>
                    <p className="record-table-decision">{row.decision}</p>
                    {row.note && row.note !== '--' ? <p className="record-table-note">{row.note}</p> : null}
                  </td>
                  <td className="record-table-outcome">{row.posture}</td>
                  <td className="record-table-outcome">{row.outcome}</td>
                  <td className={row.pnlTone ? `record-table-pnl is-${row.pnlTone}` : 'record-table-pnl'}>
                    {row.pnl}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedRow ? (
        <LedgerRowDetail row={selectedRow} onClose={() => setSelectedId(null)} />
      ) : (
        <p className="record-table-hint">Click a row for hashes and the seal claim.</p>
      )}

      {rows.length > PAGE_SIZE ? (
        <div className="record-table-pager">
          <button type="button" disabled={pageIndex <= 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
            Previous
          </button>
          <p>
            {rangeStart}–{rangeEnd} of {rows.length}
            {totalSealed > rows.length ? ` · newest of ${totalSealed.toLocaleString('en-US')} sealed` : ''}
          </p>
          <button
            type="button"
            disabled={pageIndex >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}
