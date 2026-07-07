import type { Metadata } from 'next';
import Link from 'next/link';

import { getHermesOpenExposure } from '@/features/hermes-ledger/open-exposure';
import { listHermesLedgerRows } from '@/features/hermes-ledger/store';

import Mark from '../Mark';
import TrustAutoRefresh from './TrustAutoRefresh';

export const metadata: Metadata = {
  title: 'Solace — Hermes Decision Ledger',
  description: 'Public record of Hermes decisions before outcomes are known.',
};

// The ledger is fed by the Hermes bridge; the public view refreshes every 5s
// (matching the client auto-refresh cadence).
export const revalidate = 5;

const sealedAtFormatter = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  hour: 'numeric',
  hour12: true,
  minute: '2-digit',
  month: 'short',
  timeZone: 'America/New_York',
  timeZoneName: 'short',
  year: 'numeric',
});

const pnlFormatter = new Intl.NumberFormat('en-US', {
  currency: 'USD',
  signDisplay: 'always',
  style: 'currency',
});

function formatConstant(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

const placeholderRow = {
  row: '1',
  recordId: 'HMS-000',
  sealedAt: 'Pending',
  decision: 'First decision pending',
  posture: '--',
  outcome: '--',
  pnl: '--',
  pnlTone: null as 'pos' | 'neg' | null,
  note: 'First row will be added after a decision is recorded.',
};

const MIN_VISIBLE_ROWS = 7;

const howToRead = [
  ['Sealed first', 'A row is created the moment Hermes decides — before the outcome is known. Nothing is written after the fact.'],
  ['Everything counts', 'Waits and no-trade decisions get rows. Losses and drawdowns get rows. Nothing is deleted.'],
  ['Mechanism stays private', 'Entries, exits, position sizes, and thresholds never appear here. The ledger proves discipline, not the recipe.'],
  ['Founder capital only', 'PnL shown is the founder’s own money. The ledger is a record, not a claim — the sample is young, and it is labeled that way until it isn’t.'],
];

export default async function TrustPage() {
  const [storedRows, openExposure] = await Promise.all([
    listHermesLedgerRows(200).catch(() => []),
    getHermesOpenExposure().catch(() => null),
  ]);
  const ledgerRows = storedRows.length
    ? storedRows.map((row, index) => ({
        row: String(index + 1),
        recordId: row.recordId,
        sealedAt: sealedAtFormatter.format(new Date(row.sealedAt)),
        decision: row.decision,
        posture: formatConstant(row.posture),
        outcome: row.outcome ?? 'Open',
        pnl: row.outcome === null ? '--' : row.pnl === null ? '--' : pnlFormatter.format(row.pnl),
        pnlTone:
          row.outcome === null || row.pnl === null || row.pnl === 0
            ? null
            : row.pnl > 0
              ? ('pos' as const)
              : ('neg' as const),
        note: row.note || '--',
      }))
    : [placeholderRow];
  const blankRows = Array.from(
    { length: Math.max(0, MIN_VISIBLE_ROWS - ledgerRows.length) },
    (_, index) => String(ledgerRows.length + index + 1),
  );
  const sheetStatus = [
    ['Status', storedRows.length ? `${storedRows.length} decision${storedRows.length === 1 ? '' : 's'} recorded` : 'First decision pending'],
    ['Capital', 'Founder only · $0 customer funds'],
    ['Public', 'Decisions, waits, outcomes, PnL'],
    ['Private', 'Entries, exits, sizes, thresholds'],
  ];

  return (
    <main className="hx-page trust-page">
      <TrustAutoRefresh />
      <header className="hx-header">
        <div className="hx-header-inner">
          <Link href="/" className="hx-brand">
            <Mark size={20} />
            Solace
          </Link>
          <div className="trust-header-actions">
            <Link href="/hermes" className="hx-btn hx-btn-secondary hx-btn-sm">
              Hermes
            </Link>
            <Link href="/hermes#request-access" className="hx-btn hx-btn-primary hx-btn-sm">
              Request access
            </Link>
          </div>
        </div>
      </header>

      <section className="hx-shell trust-ledger-hero">
        <p className="section-kicker">Public ledger</p>
        <h1 className="trust-title">Hermes Decision Ledger</h1>
        <p className="trust-dek">
          Every Hermes decision gets a row here before the outcome is known. Trade mechanics stay private.
        </p>
        <p className="trust-ledger-note">
          The ledger exists so Hermes can be judged by recorded decisions, not screenshots posted after the fact.
        </p>
      </section>

      <section className="hx-shell trust-sheet-section">
        <div className="trust-sheet">
          <div className="trust-sheet-toolbar">
            <div>
              <p>Sheet</p>
              <h2>Hermes decisions</h2>
            </div>
            <span>Public view</span>
          </div>

          <div className="trust-sheet-meta">
            {sheetStatus.map(([label, value]) => (
              <div key={label} className="trust-sheet-meta-cell">
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>

          {openExposure ? (
            <div className="trust-open-strip">
              <span className="trust-open-live" aria-hidden="true" />
              <p>
                Open exposure now:{' '}
                <strong
                  className={
                    openExposure.unrealizedPnl > 0 ? 'trust-pnl-pos' : openExposure.unrealizedPnl < 0 ? 'trust-pnl-neg' : undefined
                  }
                >
                  {pnlFormatter.format(openExposure.unrealizedPnl)}
                </strong>{' '}
                unrealized
                {openExposure.positions.length ? (
                  <>
                    {' · '}
                    <strong>
                      {openExposure.positions
                        .map((position) => `${position.symbol} ${position.side.toLowerCase()}`)
                        .join(', ')}
                    </strong>
                  </>
                ) : null}
              </p>
              <span className="trust-open-label">
                Live · as of {sealedAtFormatter.format(new Date(openExposure.asOf))} — moves with the market · not
                part of the sealed record
              </span>
            </div>
          ) : null}

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
                {ledgerRows.map((row) => (
                  <tr key={row.row}>
                    <td className="trust-row-number">{row.row}</td>
                    <td>
                      {row.sealedAt}
                      <span className="trust-record-id">{row.recordId}</span>
                    </td>
                    <td>{row.decision}</td>
                    <td>{row.posture}</td>
                    <td>{row.outcome}</td>
                    <td className={row.pnlTone ? `trust-pnl-${row.pnlTone}` : undefined}>{row.pnl}</td>
                    <td>{row.note}</td>
                  </tr>
                ))}
                {blankRows.map((row) => (
                  <tr key={row} className="trust-empty-row">
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
          <p className="trust-ledger-disclosure">
            Founder capital only · Young sample — a record, not a claim · Not an offer, not investment advice
          </p>
        </div>
      </section>

      <section className="hx-shell trust-section">
        <div className="trust-simple-sheet">
          <h2>How to read this</h2>
          <table>
            <tbody>
              {howToRead.map(([label, detail]) => (
                <tr key={label}>
                  <th>{label}</th>
                  <td>{detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="hx-shell">
        <div className="hx-foot">
          <p>Public ledger</p>
          <Link href="/" className="text-link">
            Return home
          </Link>
        </div>
      </section>
    </main>
  );
}
