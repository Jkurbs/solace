import type { Metadata } from 'next';
import Link from 'next/link';

import { getStoredHermesBriefSnapshot } from '@/features/hermes-brief-snapshot/store';
import { getHermesOpenExposure } from '@/features/hermes-ledger/open-exposure';
import { listHermesLedgerRows } from '@/features/hermes-ledger/store';

import Mark from '../Mark';
import ThemeToggle from '../ThemeToggle';
import CopyCommands from './CopyCommands';
import ScriptSource from './ScriptSource';
import TrustLivePnL from './TrustLivePnL';
import TrustLiveRow from './TrustLiveRow';
import { TrustLivePulseProvider } from './TrustLivePulse';
import VerifyInBrowser from './VerifyInBrowser';

export const metadata: Metadata = {
  title: 'Solace — Hermes Decision Ledger',
  description: 'Public record of Hermes decisions before outcomes are known.',
};

// Live overlay polls client-side; keep the shell dynamic so first paint isn't build-stale.
export const dynamic = 'force-dynamic';

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
  rowHash: null as string | null,
  rowClass: null as string | null,
  ref: null as string | null,
};

const MIN_VISIBLE_ROWS = 7;

const howToRead = [
  ['Sealed first', 'A row is created the moment Hermes decides, before the outcome is known. Nothing is written after the fact.'],
  [
    'Paths get two rows',
    'When capital commits, an open row seals immediately with the instrument withheld. The close row names it and references its open row when available. An errored open is voided by a new row, never deleted.',
  ],
  ['Everything counts', 'Waits and no-trade decisions get rows. Losses and drawdowns get rows. Nothing is deleted.'],
  ['Mechanism stays private', 'Entries, exits, position sizes, and thresholds never appear here. Open positions are named only after they close. The ledger proves discipline, not the recipe.'],
  ['Founder capital only', 'PnL shown is the founder’s own money. The ledger is a record, not a claim. The sample is young, and it is labeled that way until it isn’t.'],
  [
    'Backfill is labeled',
    'Nine rows recorded at the ledger rebuild carry outcomes that were already known; they are tagged BACKFILL and do not claim the sealed-first guarantee. The reclassification is itself a sealed row.',
  ],
  [
    'Verifiable by math',
    'Every row is hashed and chained to the row before it at seal time. Editing any past row breaks the chain. Recompute it yourself: the verify script lives at solace.fyi/verify-ledger.mjs and runs against the public ledger data.',
  ],
];

export default async function TrustPage() {
  const [storedRows, openExposure, briefSnapshot] = await Promise.all([
    listHermesLedgerRows(200).catch(() => []),
    getHermesOpenExposure().catch(() => null),
    getStoredHermesBriefSnapshot().catch(() => null),
  ]);
  const livePosture =
    briefSnapshot && briefSnapshot.brief_id !== 'fallback' ? formatConstant(briefSnapshot.posture) : '--';
  // Chain order assigns the row numbers; display is newest-first with the
  // live view pinned on top. Verification order is untouched.
  const ledgerRows = storedRows.length
    ? storedRows
        .map((row, index) => ({
          row: String(index + 1),
          recordId: row.recordId,
          sealedAt: sealedAtFormatter.format(new Date(row.sealedAt)),
          decision: row.decision,
          posture: formatConstant(row.posture),
          outcome: row.rowClass === 'system' ? '--' : (row.outcome ?? 'Open'),
          pnl: row.outcome === null ? '--' : row.pnl === null ? '--' : pnlFormatter.format(row.pnl),
          pnlTone:
            row.outcome === null || row.pnl === null || row.pnl === 0
              ? null
              : row.pnl > 0
                ? ('pos' as const)
                : ('neg' as const),
          note: row.note || '--',
          rowHash: row.rowHash,
          rowClass: row.rowClass,
          ref: row.ref,
        }))
        .reverse()
    : [placeholderRow];
  const blankRows = Array.from(
    { length: Math.max(0, MIN_VISIBLE_ROWS - ledgerRows.length - (openExposure ? 1 : 0)) },
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

      <TrustLivePulseProvider initialExposure={openExposure} livePosture={livePosture}>
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
            <div className="trust-sheet-meta-cell">
              <span>Live PnL</span>
              <TrustLivePnL />
            </div>
          </div>

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
                <TrustLiveRow />
                {ledgerRows.map((row) => (
                  <tr key={row.row} className={row.rowClass === 'backfill' ? 'trust-row-backfill' : undefined}>
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
            Founder capital only · PnL net of fees and funding · Young sample: a record, not a claim · Not an
            offer, not investment advice
          </p>
        </div>
      </section>
      </TrustLivePulseProvider>

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

      <section className="hx-shell trust-section">
        <div className="trust-simple-sheet trust-verify">
          <h2>Verify this ledger</h2>
          <p>
            Anyone with Node installed can recompute the chain from the public data. No account, no
            permission:
          </p>
          <CopyCommands
            commands={`curl -LO https://www.solace.fyi/verify-ledger.mjs
node verify-ledger.mjs`}
          />
          <p>
            The script is ~90 lines of readable source. It recomputes every row hash from the{' '}
            <a href="/api/hermes/decision-ledger" className="text-link">
              public ledger data
            </a>
            , walks the chain, and checks that every close references its open row. Any edit to
            history fails loudly. The printed chain head can be compared against an externally
            anchored copy.
          </p>
          <VerifyInBrowser />
          <ScriptSource />
        </div>
      </section>

      <section className="hx-shell">
        <div className="hx-foot">
          <p>Public ledger</p>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '1rem' }}>
            <ThemeToggle />
            <Link href="/" className="text-link">
              Return home
            </Link>
          </span>
        </div>
      </section>
    </main>
  );
}
