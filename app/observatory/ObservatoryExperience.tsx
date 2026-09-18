import type { ReactNode } from 'react';
import Link from 'next/link';

import { ShimmerLink } from '@/components/shimmer-link';
import SiteFooter from '@/components/site-footer';
import SiteHeader from '@/components/site-header';
import type { TrustLedgerDisplayRow } from '@/app/trust/TrustLedgerTable';
import ShareLedger from '@/app/trust/ShareLedger';
import VerifyInBrowser from '@/app/trust/VerifyInBrowser';
import VerifyOnDemand from './VerifyOnDemand';
import type { ActivePrediction } from '@/app/oracle/active-predictions';
import type { ResolvedQuestion } from '@/app/oracle/resolved-questions';
import { formatPercent, type LedgerScoreboard } from '@/features/hermes-ledger/scoreboard';
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

export type HermesRecordChrome = {
  sealedDecisions: number;
  hitRate: number | null;
  sidedCloses: number;
  lastSealLabel: string | null;
  livePosture: string;
  hermesLabel: string;
  hermesVersion: { id: string; label: string };
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

export default function ObservatoryExperience({
  chrome,
  children,
}: {
  chrome: HermesRecordChrome;
  children: ReactNode;
}) {
  const winRateLabel = chrome.hitRate === null ? '-' : formatPercent(chrome.hitRate);

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

          <div className="record-hero-ctas">
            <VerifyInBrowser label="Verify ledger" />
          </div>

          <div className="home-record mt-10 md:mt-12" aria-label="Hermes record">
            <div className="home-record-counts">
              {chrome.sealedDecisions > 0 && (
                <div>
                  <p className="home-record-count">{chrome.sealedDecisions.toLocaleString('en-US')}</p>
                  <p className="home-record-label">Sealed</p>
                </div>
              )}
              {chrome.lastSealLabel && (
                <div>
                  <p className="home-record-meta">{chrome.lastSealLabel}</p>
                  <p className="home-record-label">Last seal</p>
                </div>
              )}
              {winRateLabel !== '-' && (
                <div>
                  <p className="home-record-meta">{winRateLabel}</p>
                  <p className="home-record-label">Win rate · n={chrome.sidedCloses}</p>
                </div>
              )}
            </div>
            <p className="home-record-note">
              Founder capital. Young sample. Newest first.
            </p>
          </div>
        </div>
      </section>

      {children}

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
              <ShimmerLink href="/oracle" tone="ink">
                Open Oracle
              </ShimmerLink>
            </li>
            <li>
              <p className="home-vision-domain">Glorya</p>
              <p>
                Does not move money until Solace has $1M cumulative revenue. Zero sealed
                disbursements.
              </p>
              <ShimmerLink href="/glorya" tone="ink">
                Open Glorya
              </ShimmerLink>
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
