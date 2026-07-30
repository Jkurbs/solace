import type { Metadata } from 'next';
import Link from 'next/link';

import { getStoredHermesBriefSnapshot } from '@/features/hermes-brief-snapshot/store';
import { correctSealedClosePnls } from '@/features/hermes-ledger/close-pnl';
import { getHermesOpenExposure } from '@/features/hermes-ledger/open-exposure';
import { computeLedgerScoreboard } from '@/features/hermes-ledger/scoreboard';
import { listHermesLedgerRows } from '@/features/hermes-ledger/store';
import { hermesVersion } from '@/features/hermes-version';
import { getRecentHermesRealizedTradeEvents } from '@/features/ledger/hermes-realized-trades';
import {
  OBSERVATORY_HERMES_PATH,
  OBSERVATORY_PATH,
} from '@/features/observatory/paths';

import Mark from '../../../Mark';
import ThemeToggle from '../../../ThemeToggle';
import CopyCommands from '../../../trust/CopyCommands';
import ScriptSource from '../../../trust/ScriptSource';
import TrustLedgerTable from '../../../trust/TrustLedgerTable';
import TrustLivePnL from '../../../trust/TrustLivePnL';
import { TrustLivePulseProvider } from '../../../trust/TrustLivePulse';
import ShareLedger from '../../../trust/ShareLedger';
import TrustScoreboard from '../../../trust/TrustScoreboard';
import VerifyInBrowser from '../../../trust/VerifyInBrowser';

export const metadata: Metadata = {
  title: 'Solace — Hermes Decision Ledger',
  description:
    'Public sealed record of Hermes decisions before outcomes are known. Founder capital · checkable chain. Part of the Observatory.',
  alternates: {
    canonical: 'https://solace.fyi/observatory/hermes/ledger',
  },
  openGraph: {
    title: 'Solace — Hermes Decision Ledger',
    description:
      'Sealed before the outcome is known. Public process metrics and a checkable decision chain.',
    url: 'https://solace.fyi/observatory/hermes/ledger',
    type: 'website',
    siteName: 'Solace',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Solace — Hermes Decision Ledger',
    description:
      'Sealed before the outcome is known. Public process metrics and a checkable decision chain.',
  },
};

// Live overlay polls client-side; short ISR is enough for the sealed shell.
export const revalidate = 60;

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
  eventType: null as string | null,
  ref: null as string | null,
  hermesVersion: null as string | null,
};

const howToRead = [
  ['Sealed first', 'A row is created the moment Hermes decides, before the outcome is known. Nothing is written after the fact.'],
  [
    'Paths get two rows',
    'When capital commits, an open row seals immediately with the instrument withheld. The close row names it and references its open row when available. An errored open is voided by a new row, never deleted.',
  ],
  ['Everything counts', 'Waits and no-trade decisions get rows. Losses and drawdowns get rows. Nothing is deleted.'],
  ['Mechanism stays private', 'Entries, exits, position sizes, and thresholds never appear here. Open positions are named only after they close. The ledger proves discipline, not the recipe.'],
  [
    'Hermes version',
    `Each new row stamps the agent that made the commitment (currently ${hermesVersion.label}). Rows sealed before versioning show no chip. A version cutover is also recorded as a sealed system row.`,
  ],
  ['Founder capital only', 'PnL shown is the founder’s own money. The ledger is a record, not a claim. The sample is young, and it is labeled that way until it isn’t.'],
  [
    'Backfill is labeled',
    'Nine rows recorded at the ledger rebuild carry outcomes that were already known; they are tagged BACKFILL and do not claim the sealed-first guarantee. The reclassification is itself a sealed row.',
  ],
  [
    'Process before performance',
    'The scoreboard above the sheet leads with sealed decisions, live open paths vs closes, standing-down rate, and backfills. Open paths come from the same live marks as the LIVE row — not from historical open seals still unpaired on the chain. Outcome metrics stay behind a toggle so the page does not read as a trading log.',
  ],
  [
    'Verifiable by math',
    'Every row is hashed and chained to the row before it at seal time. Editing any past row breaks the chain. Recompute it yourself: the verify script lives at solace.fyi/verify-ledger.mjs and runs against the public ledger data.',
  ],
];

export default async function HermesLedgerPage() {
  const poolId = process.env.HERMES_POOL_ID ?? 'pool_balanced_v1';
  const [storedRows, openExposure, briefSnapshot, realizedTrades] = await Promise.all([
    listHermesLedgerRows(1000).catch(() => []),
    getHermesOpenExposure().catch(() => null),
    getStoredHermesBriefSnapshot().catch(() => null),
    getRecentHermesRealizedTradeEvents({ limit: 500, poolId }).catch(() => []),
  ]);
  // KuCoin pnl is already fee-net; Hermes netPnl sometimes double-counts. Correct
  // sealed close figures for public display/scoreboard (chain bytes unchanged).
  const displayRows = correctSealedClosePnls(
    storedRows,
    realizedTrades.map((trade) => ({
      fees: trade.fees,
      funding: trade.funding,
      netPnl: trade.netPnl,
      realizedPnl: trade.realizedPnl,
      sourceTradeId: trade.sourceTradeId,
    })),
  );
  const scoreboard = computeLedgerScoreboard(displayRows, {
    // Headline open count = live marks (same source as the LIVE row), never
    // the pile of unpaired historical open seals on the chain.
    liveOpenPaths: openExposure ? openExposure.positions.length : null,
  });
  const livePosture =
    briefSnapshot && briefSnapshot.brief_id !== 'fallback' ? formatConstant(briefSnapshot.posture) : '--';
  // Chain order assigns the row numbers; display is newest-first with the
  // live view pinned on top. Verification order is untouched.
  const ledgerRows = displayRows.length
    ? displayRows
        .map((row, index) => ({
          row: String(index + 1),
          recordId: row.recordId,
          sealedAt: sealedAtFormatter.format(new Date(row.sealedAt)),
          decision: row.decision,
          posture: formatConstant(row.posture),
          outcome:
            row.rowClass === 'system'
              ? '--'
              : row.eventType === 'open'
                ? 'Open'
                : row.outcome ?? '--',
          pnl:
            row.eventType === 'open' || row.outcome === null
              ? '--'
              : row.pnl === null
                ? '--'
                : pnlFormatter.format(row.pnl),
          pnlTone:
            row.outcome === null || row.pnl === null || row.pnl === 0
              ? null
              : row.pnl > 0
                ? ('pos' as const)
                : ('neg' as const),
          note: row.note || '--',
          rowHash: row.rowHash,
          rowClass: row.rowClass,
          eventType: row.eventType,
          ref: row.ref,
          hermesVersion: row.hermesVersion,
        }))
        .reverse()
    : [placeholderRow];
  const sheetStatus = [
    ['Status', storedRows.length ? `${storedRows.length} decision${storedRows.length === 1 ? '' : 's'} recorded` : 'First decision pending'],
    ['Hermes', hermesVersion.label],
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
            <Link href={OBSERVATORY_PATH} className="hx-btn hx-btn-secondary hx-btn-sm">
              Observatory
            </Link>
            <Link href={OBSERVATORY_HERMES_PATH} className="hx-btn hx-btn-secondary hx-btn-sm">
              Hermes
            </Link>
            <Link href="/dashboard" className="hx-btn hx-btn-primary hx-btn-sm">
              Enter Hermes
            </Link>
          </div>
        </div>
      </header>

      <section className="hx-shell trust-ledger-hero">
        <p className="section-kicker">
          <Link href={OBSERVATORY_PATH} className="text-link">
            Observatory
          </Link>
          <span aria-hidden="true"> · </span>
          <Link href={OBSERVATORY_HERMES_PATH} className="text-link">
            Hermes
          </Link>
          <span aria-hidden="true"> · </span>
          Decision ledger
        </p>
        <h1 className="trust-title">Hermes Decision Ledger</h1>
        <p className="trust-dek">
          Every Hermes decision gets a row here before the outcome is known. Trade mechanics stay private.
          This is Hermes’s deep record inside the Observatory — not a separate product from watching the
          instrument.
        </p>
        <p className="trust-ledger-note">
          The ledger exists so Hermes can be judged by recorded decisions, not screenshots posted after the fact.
        </p>
        <ShareLedger />
      </section>

      <TrustLivePulseProvider
        initialExposure={openExposure}
        initialHermesVersion={{ id: hermesVersion.id, label: hermesVersion.label }}
        livePosture={livePosture}
      >
      <section className="hx-shell trust-sheet-section">
        <div className="trust-sheet">
          <div className="trust-sheet-toolbar">
            <div>
              <p>Sheet</p>
              <h2>Hermes decisions</h2>
            </div>
            <span>Public view</span>
          </div>

          <TrustScoreboard scoreboard={scoreboard} />

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

          <TrustLedgerTable rows={ledgerRows} />
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
          <p>Observatory · Hermes · Decision ledger</p>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '1rem' }}>
            <ThemeToggle />
            <Link href={OBSERVATORY_HERMES_PATH} className="text-link">
              Hermes in Observatory
            </Link>
            <Link href={OBSERVATORY_PATH} className="text-link">
              All instruments
            </Link>
          </span>
        </div>
      </section>
    </main>
  );
}
