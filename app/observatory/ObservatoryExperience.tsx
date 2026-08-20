import Link from 'next/link';

import SiteFooter from '@/components/site-footer';
import SiteHeader from '@/components/site-header';
import type { TrustLedgerDisplayRow } from '@/app/trust/TrustLedgerTable';
import ShareLedger from '@/app/trust/ShareLedger';
import HeldPanel from './HeldPanel';
import RecordTable from './RecordTable';
import VerifyOnDemand from './VerifyOnDemand';
import type { ActivePrediction } from '@/app/oracle/active-predictions';
import type { ResolvedQuestion } from '@/app/oracle/resolved-questions';
import type { LedgerScoreboard } from '@/features/hermes-ledger/scoreboard';
import type { GloryaEvaluatedNeed } from '@/features/glorya/types';

export type OracleChainData = {
  active: ActivePrediction[];
  activeCount: number;
  resolved: number;
  brier: number;
  asOf: string;
  resolvedQuestions: ResolvedQuestion[];
  feedError: string | null;
};

export type GloryaChainData = {
  evaluated: number;
  standingDown: number;
  standDownRate: number;
  active: number;
  completed: number;
  needs: GloryaEvaluatedNeed[];
};

export type HermesChainData = {
  rows: TrustLedgerDisplayRow[];
  scoreboard: LedgerScoreboard;
  openLabel: string;
  sealedDecisions: number;
  standDownRate: string;
  livePosture: string;
  hermesLabel: string;
  openExposure: {
    asOf: string;
    unrealizedPnl: number;
    positions: Array<{ symbol: string; side: string }>;
  } | null;
  hermesVersion: { id: string; label: string };
  anchor: {
    cadence: string;
    lastAnchoredLabel: string;
    href: string;
    label: string;
  } | null;
};

const TABLE_WINDOW = 80;

export default function ObservatoryExperience({ hermes }: { hermes: HermesChainData }) {
  const tableRows = hermes.rows.slice(0, TABLE_WINDOW);
  const lastSeal = tableRows.find((row) => row.sealedAt && row.sealedAt !== 'Pending')?.sealedAt ?? null;

  return (
    <main className="home-research min-h-screen bg-background pt-16 text-foreground antialiased">
      <SiteHeader />

      <section className="px-5 pt-16 pb-10 md:pt-24 md:pb-14">
        <div className="record-hero mx-auto max-w-6xl">
          <div className="record-hero-head">
            <div>
              <p className="hero-particle-eyebrow">Hermes · founder capital</p>
              <h1 className="hero-particle-title home-hero-title is-mission">Public record.</h1>
            </div>
            <ShareLedger />
          </div>
          <p className="home-hero-dek">
            Every decision is written down before anyone knows if it was right. You can check the
            chain. Founder capital. Young sample.
          </p>

          <div className="home-record mt-10 md:mt-12" aria-label="Hermes record">
            <div className="home-record-counts">
              {hermes.sealedDecisions > 0 && (
                <div>
                  <p className="home-record-count">{hermes.sealedDecisions.toLocaleString('en-US')}</p>
                  <p className="home-record-label">Sealed</p>
                </div>
              )}
              {lastSeal && (
                <div>
                  <p className="home-record-meta">{lastSeal}</p>
                  <p className="home-record-label">Last seal</p>
                </div>
              )}
              {hermes.standDownRate && hermes.standDownRate !== '-' && (
                <div>
                  <p className="home-record-meta">{hermes.standDownRate}</p>
                  <p className="home-record-label">Standing down</p>
                </div>
              )}
              {hermes.anchor && (
                <div>
                  <Link href={hermes.anchor.href} className="home-record-meta home-record-link">
                    {hermes.anchor.lastAnchoredLabel}
                  </Link>
                  <p className="home-record-label">Published outside our servers</p>
                </div>
              )}
            </div>
            <p className="home-record-note">
              Founder capital. Young sample. Newest first.
            </p>
          </div>
        </div>
      </section>

      <section className="record-section border-t border-border pb-12 md:px-5 md:pb-16" aria-label="Sealed rows">
        <div className="mx-auto max-w-6xl">
          <HeldPanel
            exposure={hermes.openExposure}
            hermesVersion={hermes.hermesVersion}
            livePosture={hermes.livePosture}
            winRate={hermes.scoreboard.performance.hitRate}
            winRateSample={
              hermes.scoreboard.performance.positive + hermes.scoreboard.performance.negative
            }
          />
          <RecordTable rows={tableRows} totalSealed={hermes.sealedDecisions} />
          <p className="record-section-note mt-8 max-w-xl text-sm leading-relaxed text-muted">
            Founder capital only. Young sample: a record, not a claim. Not an offer, not investment
            advice.
          </p>
        </div>
      </section>

      <section className="border-t border-border px-5 py-12 md:py-16">
        <div className="mx-auto max-w-6xl">
          <VerifyOnDemand />
        </div>
      </section>

      <section className="border-t border-border px-5 py-16 md:py-20">
        <div className="mx-auto max-w-6xl">
          <p className="home-vision-kicker">Also</p>
          <ul className="home-leaves">
            <li>
              <p className="home-vision-domain">Oracle</p>
              <p>
                Writes a probability before the event, then scores it against what happened. The
                sample is still young.
              </p>
              <Link href="/oracle">Open Oracle</Link>
            </li>
            <li>
              <p className="home-vision-domain">Glorya</p>
              <p>
                Does not move money until Solace has $1M cumulative revenue. Zero sealed
                disbursements.
              </p>
              <Link href="/glorya">Open Glorya</Link>
            </li>
          </ul>
          <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <Link
              href="/hermes"
              className="text-muted underline decoration-transparent underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground/30"
            >
              Hermes
            </Link>
            <Link
              href="/brief"
              className="text-muted underline decoration-transparent underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground/30"
            >
              Read the brief
            </Link>
            <Link
              href="/anchor"
              className="text-muted underline decoration-transparent underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground/30"
            >
              Anchors
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
