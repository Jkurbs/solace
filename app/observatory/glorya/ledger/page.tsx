import type { Metadata } from 'next';
import Link from 'next/link';

import { gloryaProcessScoreboard } from '@/features/glorya/evaluated-needs';
import { OBSERVATORY_PATH } from '@/features/observatory/paths';

import Mark from '../../../Mark';
import ThemeToggle from '../../../ThemeToggle';

export const metadata: Metadata = {
  title: 'Solace · Glorya Decision Ledger',
  description:
    'Public sealed record of Glorya humanitarian decisions before outcomes are known. Empty until the first disbursement after the revenue gate.',
  alternates: {
    canonical: 'https://solace.fyi/observatory/glorya/ledger',
  },
};

export const revalidate = 60;

/**
 * Glorya decision ledger shell.
 * Rows seal with the first disbursement after the $1M revenue gate.
 * Until then this is the honest empty public place for the instrument’s record.
 */
export default function GloryaLedgerPage() {
  const scoreboard = gloryaProcessScoreboard();

  return (
    <main className="hermes-paper ledger-doc min-h-screen bg-background text-foreground antialiased">
      <header className="hermes-paper-header">
        <div className="hermes-paper-header-inner">
          <Link href="/" className="hermes-paper-brand" aria-label="Solace home">
            <Mark size={18} className="site-mark" />
            <span>Solace</span>
          </Link>
          <nav className="hermes-paper-nav" aria-label="Primary">
            <Link href={OBSERVATORY_PATH}>Observatory</Link>
            <Link href="/glorya">Glorya</Link>
            <Link href="/hermes">Hermes</Link>
          </nav>
          <div className="hermes-paper-actions">
            <ThemeToggle />
            <Link href="/glorya" className="hermes-paper-btn hermes-paper-btn-primary hermes-paper-btn-sm">
              Open Glorya
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
          <Link href="/glorya" className="ledger-doc-crumb">
            Glorya
          </Link>
          <span aria-hidden="true"> · </span>
          Decision ledger
        </p>
        <h1 className="ledger-doc-title">Glorya decision ledger</h1>
        <p className="hermes-paper-lede">
          Every Glorya decision is sealed before the outcome is known. First disbursement seals the first row.
          Until then the sheet is empty by design, not a hidden history.
        </p>
      </section>

      <section className="hermes-paper-shell ledger-doc-sheet-section" aria-label="Glorya decision ledger">
        <div className="ledger-doc-sheet">
          <div className="ledger-doc-head">
            <div className="ledger-doc-head-main">
              <span className="ledger-doc-head-kicker">Public record</span>
              <strong className="ledger-doc-head-title">Glorya decision ledger</strong>
            </div>
            <div className="ledger-doc-stats" aria-label="Process summary">
              <span>
                <em>Evaluated</em>
                <strong>{scoreboard.evaluated}</strong>
              </span>
              <span>
                <em>Standing down</em>
                <strong>{Math.round(scoreboard.standDownRate * 100)}%</strong>
              </span>
              <span>
                <em>Sealed rows</em>
                <strong>0</strong>
              </span>
            </div>
          </div>

          <div className="ledger-doc-note">
            Sealed before the outcome is known. Hash-chained · public · checkable · humanitarian capital only
            when need and path both clear.
          </div>

          <div className="oracle-ledger-empty">
            <p className="oracle-ledger-empty-title">No sealed Glorya rows yet</p>
            <p className="oracle-ledger-empty-dek">
              Glorya is evaluating needs and standing down where intervention cannot change the outcome. Live
              capital waits on Solace reaching $1M cumulative revenue. When the first disbursement is ready, it
              will seal the first public row here. Until then, the design layer lives on the{' '}
              <Link href="/glorya" className="ledger-doc-link">
                Glorya board
              </Link>
              .
            </p>
          </div>

          <p className="ledger-doc-disclosure">
            $0 customer funds · No impact claims · Design and evaluation only · Not a solicitation for
            donations
          </p>
        </div>
      </section>

      <footer className="hermes-paper-foot">
        <div className="hermes-paper-shell hermes-paper-foot-inner">
          <p>Observatory · Glorya · Decision ledger</p>
          <span className="hermes-paper-foot-links">
            <ThemeToggle />
            <Link href="/glorya">Glorya</Link>
            <Link href={OBSERVATORY_PATH}>All instruments</Link>
            <Link href="/observatory/hermes/ledger">Hermes ledger</Link>
          </span>
        </div>
      </footer>
    </main>
  );
}
