import type { Metadata } from 'next';
import Link from 'next/link';

import { calibration } from '@/app/calibration';
import { hermesVersion } from '@/features/hermes-version';
import { OBSERVATORY_PATH } from '@/features/observatory/paths';

import Mark from '../../../Mark';
import ThemeToggle from '../../../ThemeToggle';

export const metadata: Metadata = {
  title: 'Solace · Oracle Decision Ledger',
  description:
    'Public sealed record of Oracle beliefs before outcomes are known. Hash-chained, checkable. Part of the Observatory.',
  alternates: {
    canonical: 'https://solace.fyi/observatory/oracle/ledger',
  },
};

export const revalidate = 60;

/**
 * Oracle decision ledger shell.
 * Full row store ships with the Oracle ingest path; until then this page is
 * the honest public place for the instrument’s sealed-belief record, with
 * live calibration stats and a clear empty state.
 */
export default function OracleLedgerPage() {
  return (
    <main className="hermes-paper ledger-doc oracle-ledger min-h-screen bg-background text-foreground antialiased">
      <header className="hermes-paper-header">
        <div className="hermes-paper-header-inner">
          <Link href="/" className="hermes-paper-brand" aria-label="Solace home">
            <Mark size={18} className="site-mark" />
            <span>Solace</span>
          </Link>
          <nav className="hermes-paper-nav" aria-label="Primary">
            <Link href={OBSERVATORY_PATH}>Observatory</Link>
            <Link href="/oracle">Oracle</Link>
            <Link href="/hermes">Hermes</Link>
          </nav>
          <div className="hermes-paper-actions">
            <ThemeToggle />
            <Link href="/oracle" className="hermes-paper-btn hermes-paper-btn-primary hermes-paper-btn-sm">
              Open Oracle
            </Link>
          </div>
        </div>
      </header>

      <section className="hermes-paper-shell ledger-doc-intro">
        <p className="hermes-paper-kicker">
          <Link href={OBSERVATORY_PATH} className="ledger-doc-crumb">
            Observatory
          </Link>
          <span aria-hidden="true"> · </span>
          <Link href="/oracle" className="ledger-doc-crumb">
            Oracle
          </Link>
          <span aria-hidden="true"> · </span>
          Decision ledger
        </p>
        <h1 className="ledger-doc-title">Oracle decision ledger</h1>
        <p className="hermes-paper-lede">
          Every Oracle belief is sealed before the outcome is known. When the world resolves, the score is
          public. Wins and misses alike.
        </p>
      </section>

      <section className="hermes-paper-shell ledger-doc-sheet-section" aria-label="Oracle decision ledger">
        <div className="ledger-doc-sheet">
          <div className="ledger-doc-head">
            <div className="ledger-doc-head-main">
              <span className="ledger-doc-head-kicker">Public record</span>
              <strong className="ledger-doc-head-title">Oracle decision ledger</strong>
            </div>
            <div className="ledger-doc-stats" aria-label="Process summary">
              <span>
                <em>Resolved</em>
                <strong>{calibration.resolved.toLocaleString('en-US')}</strong>
              </span>
              <span>
                <em>Brier</em>
                <strong>{calibration.brier.toFixed(2)}</strong>
              </span>
              <span>
                <em>Capital</em>
                <strong>None</strong>
              </span>
            </div>
          </div>

          <div className="ledger-doc-note">
            Every row is sealed before the outcome is known. Hash-chained · public · checkable · beliefs, not
            trades.
          </div>

          <div className="oracle-ledger-empty">
            <p className="oracle-ledger-empty-title">Sealed belief rows are coming online</p>
            <p className="oracle-ledger-empty-dek">
              The Oracle already scores {calibration.resolved} resolved questions on the public board
              (Brier {calibration.brier.toFixed(2)}, as of {calibration.asOf}). The decision ledger will list
              each belief as a sealed row, the same way Hermes seals capital decisions, once the Oracle
              ingest path writes them here. Until then, the living record is the{' '}
              <Link href="/oracle" className="ledger-doc-link">
                Oracle board
              </Link>
              .
            </p>
          </div>

          <p className="ledger-doc-disclosure">
            No customer funds · No performance claim · Young sample · Not investment advice · {hermesVersion.label}{' '}
            observatory
          </p>
        </div>
      </section>

      <footer className="hermes-paper-foot">
        <div className="hermes-paper-shell hermes-paper-foot-inner">
          <p>Observatory · Oracle · Decision ledger</p>
          <span className="hermes-paper-foot-links">
            <ThemeToggle />
            <Link href="/oracle">Oracle</Link>
            <Link href={OBSERVATORY_PATH}>All instruments</Link>
            <Link href="/observatory/hermes/ledger">Hermes ledger</Link>
          </span>
        </div>
      </footer>
    </main>
  );
}
