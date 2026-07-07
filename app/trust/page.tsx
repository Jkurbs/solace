import type { Metadata } from 'next';
import Link from 'next/link';

import Mark from '../Mark';

export const metadata: Metadata = {
  title: 'Solace — Hermes Decision Ledger',
  description: 'Public record of Hermes decisions before outcomes are known.',
};

const sheetStatus = [
  ['Status', 'First decision pending'],
  ['Scope', 'Founder capital'],
  ['Public view', 'Decision fields only'],
  ['Private view', 'Entries, exits, targets hidden'],
  ['Customer funds', '$0 managed'],
];

const ledgerRows = [
  {
    row: '1',
    sealedAt: 'Pending',
    recordId: 'HMS-000',
    decision: 'First decision pending',
    posture: '--',
    capital: '--',
    outcome: '--',
    pnl: '--',
    note: 'First row will be added after a decision is recorded.',
  },
];

const blankRows = ['2', '3', '4', '5', '6', '7'];

const publicFields = [
  'Time',
  'Record ID',
  'Decision',
  'Posture',
  'Capital state',
  'Outcome',
  'PnL / drawdown',
  'Note',
];

const privateFields = ['Entries', 'Exits', 'Targets', 'Thresholds', 'Size', 'Fills', 'Raw state', 'Route logs'];

const rules = [
  ['Recorded before outcome', 'Create the row before the result is known.'],
  ['Waits included', 'Include wait and no-trade decisions.'],
  ['Losses included', 'Include losses and drawdowns.'],
  ['Details private', 'Do not show entries, exits, targets, fills, or raw state.'],
  [
    'Founder capital only',
    'PnL shown is the founder’s own capital. The ledger is a record, not a claim — the sample is young, and it is labeled that way until it isn’t.',
  ],
];

const accessRows = [
  ['Founder capital', 'Active'],
  ['Public method', 'In progress'],
  ['Decision rows', 'Next'],
  ['Review', 'Later'],
  ['Outside capital', 'Not accepted'],
];

export default function TrustPage() {
  return (
    <main className="hx-page trust-page">
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
          A public record of Hermes decisions before outcomes are known. Trade details stay private.
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

          <div className="trust-table-wrap">
            <table className="trust-ledger-table">
              <thead>
                <tr>
                  <th className="trust-row-head">#</th>
                  <th>Time</th>
                  <th>Record ID</th>
                  <th>Decision</th>
                  <th>Posture</th>
                  <th>Capital</th>
                  <th>Outcome</th>
                  <th>PnL / DD</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {ledgerRows.map((row) => (
                  <tr key={row.row}>
                    <td className="trust-row-number">{row.row}</td>
                    <td>{row.sealedAt}</td>
                    <td>
                      <span className="trust-record-id">{row.recordId}</span>
                    </td>
                    <td>{row.decision}</td>
                    <td>{row.posture}</td>
                    <td>{row.capital}</td>
                    <td>{row.outcome}</td>
                    <td>{row.pnl}</td>
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
        <div className="trust-info-grid">
          <div className="trust-info-table">
            <h2>Public columns</h2>
            <ul>
              {publicFields.map((field) => (
                <li key={field}>
                  <span>{field}</span>
                  <em>public</em>
                </li>
              ))}
            </ul>
          </div>

          <div className="trust-info-table">
            <h2>Private columns</h2>
            <ul>
              {privateFields.map((field) => (
                <li key={field}>
                  <span>{field}</span>
                  <em>private</em>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="hx-shell trust-section">
        <div className="trust-simple-sheet">
          <h2>Rules</h2>
          <table>
            <tbody>
              {rules.map(([label, detail]) => (
                <tr key={label}>
                  <th>{label}</th>
                  <td>{detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="hx-shell trust-section trust-roadmap-section">
        <div className="trust-simple-sheet">
          <h2>Access status</h2>
          <table>
            <tbody>
              {accessRows.map(([label, value]) => (
                <tr key={label}>
                  <th>{label}</th>
                  <td>{value}</td>
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
