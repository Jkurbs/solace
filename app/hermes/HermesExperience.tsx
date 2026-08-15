'use client';

import React from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';

import SiteFooter from '@/components/site-footer';
import SiteHeader from '@/components/site-header';
import { OBSERVATORY_HERMES_LEDGER_PATH } from '@/features/observatory/paths';

import { ExperienceHermesButton, HermesOnboardingProvider } from './HermesOnboarding';

export type HermesTimelineEntry = {
  action: string;
  time: string;
  detail: string;
  outcome: string;
  resolved: boolean;
};

export type HermesProof = {
  posture: string | null;
  postureAge: string | null;
  condition: string | null;
  reason: string | null;
  sealedDecisions: number;
  openPaths: number | null;
  closedPaths: number;
  hermesLabel: string;
  hermesVersionId: string;
  liveUnrealizedPnl: number | null;
  expectancy: number | null;
  hitRateLabel: string;
  sampleSize: number;
  positive: number;
  negative: number;
  standDownRateLabel: string;
  timeline: HermesTimelineEntry[];
};

export type HermesAnchorStatus = {
  cadence: string;
  href?: string;
};

const easeOut = [0.16, 1, 0.3, 1] as [number, number, number, number];

const fade = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: easeOut } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.06 } },
};

const faqItems = [
  {
    q: 'Is Hermes a trading bot or automated signal tool?',
    a: 'No. Hermes is an autonomous quantitative investment engine operated by Solace. It manages long-term market risk and capital allocation. It does not provide trading signals, education, or financial advice.',
  },
  {
    q: 'How do I join the allocation waitlist?',
    a: 'Launch the interactive simulation below to test the decision engine with paper capital. You can apply for future capital allocation directly from the simulation dashboard.',
  },
  {
    q: 'How is Hermes different from a traditional hedge fund?',
    a: 'Hermes operates with total operational transparency. Every capital allocation decision, risk reduction, and regime shift is sealed onto an immutable public record before capital moves.',
  },
  {
    q: 'What does "verifiable by math" mean?',
    a: 'Before any capital is deployed, the exact decision parameters are hashed and timestamped on a public chain. This creates a tamper-proof audit trail proving the decision occurred prior to market execution.',
  },
] as const;

export default function HermesExperience({
  proof,
  anchor = null,
}: {
  proof: HermesProof;
  anchor?: HermesAnchorStatus | null;
}) {
  const reduceMotion = useReducedMotion();
  const heroInitial = reduceMotion ? false : 'hidden';

  const showRecord =
    proof.sealedDecisions > 0 || Boolean(proof.condition || proof.posture || proof.reason);

  const timeline = proof.timeline.slice(0, 5);
  const lastSeal = timeline[0]?.time ?? null;

  return (
    <HermesOnboardingProvider>
      <main className="home-research min-h-screen bg-background pt-16 text-foreground antialiased selection:bg-foreground/10">
        <SiteHeader />

        <section className="hero-research px-5 pt-16 pb-20 md:pt-24 md:pb-28">
          <motion.div
            className="mx-auto max-w-6xl"
            initial={heroInitial}
            animate="show"
            variants={stagger}
          >
            <div className="home-hero-copy">
              <motion.p variants={fade} className="hero-particle-eyebrow">
                Hermes · Autonomous Investment Engine
              </motion.p>

              <motion.h1 variants={fade} className="hero-particle-title home-hero-title">
                <span className="home-hero-line">An autonomous investment system.</span>
                <span className="home-hero-line home-hero-line-2">Verifiable capital allocation.</span>
              </motion.h1>

              <motion.p variants={fade} className="home-hero-dek">
                Hermes continuously evaluates market structure and allocates capital automatically.
                Inspect its live decision engine, verify the public audit trail, or run a paper simulation.
              </motion.p>

              <motion.div variants={fade} className="hero-particle-ctas mb-3 mt-6 flex flex-col sm:flex-row gap-3">
                <ExperienceHermesButton className="hero-cta hero-cta-primary">
                  Simulate Allocation Strategy
                </ExperienceHermesButton>
                <Link href={OBSERVATORY_HERMES_LEDGER_PATH} className="hero-cta hero-cta-secondary">
                  Inspect Public Ledger
                </Link>
              </motion.div>

              <motion.p variants={fade} className="text-xs text-muted mb-10">
                Run paper capital following Hermes's live decisions. You can request allocation access directly from the simulation dashboard.
              </motion.p>

              <motion.div variants={fade} className="mb-8 max-w-2xl border-t border-border pt-6">
                <p className="text-xs font-medium uppercase tracking-wider text-muted">
                  Institutional Rigor · Fully Transparent
                </p>
                <ul className="mt-2 text-sm text-muted space-y-1.5">
                  <li>• <strong>Skin in the Game:</strong> Deploys exclusively with the creator's personal capital.</li>
                  <li>• <strong>Tamper-Proof Audit Trail:</strong> Every allocation decision is cryptographically locked before capital moves, preventing retrofitted history.</li>
                  <li>• <strong>Systematic Preservation:</strong> Designed to capture upside during expansion regimes while standing down to preserve capital during market stress.</li>
                </ul>
              </motion.div>

              {showRecord && (
                <motion.div variants={fade} className="home-record" aria-label="Live Hermes record">
                  {(proof.condition || proof.posture || proof.reason) && (
                    <div className="home-record-readout">
                      {proof.condition && (
                        <div>
                          <p className="home-record-label">Market Regime</p>
                          <p className="home-record-value">{proof.condition}</p>
                        </div>
                      )}
                      {proof.posture && (
                        <div>
                          <p className="home-record-label">Capital Posture</p>
                          <p className="home-record-value">{proof.posture}</p>
                        </div>
                      )}
                      {proof.reason && (
                        <div>
                          <p className="home-record-label">Investment Thesis</p>
                          <p className="home-record-value home-record-value-quiet">{proof.reason}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {proof.sealedDecisions > 0 && (
                    <div className="home-record-counts">
                      <div>
                        <p className="home-record-count">
                          {proof.sealedDecisions.toLocaleString('en-US')}
                        </p>
                        <p className="home-record-label">Sealed Decisions</p>
                      </div>
                      {lastSeal && (
                        <div>
                          <p className="home-record-meta">{lastSeal}</p>
                          <p className="home-record-label">Last Timestamp</p>
                        </div>
                      )}
                      {proof.hitRateLabel !== '-' && (
                        <div>
                          <p className="home-record-meta">{proof.hitRateLabel}</p>
                          <p className="home-record-label">Hit Rate · n={proof.sampleSize}</p>
                        </div>
                      )}
                      {anchor && (
                        <div>
                          <Link
                            href={anchor.href ?? '/anchor'}
                            className="home-record-meta home-record-link"
                          >
                            {anchor.cadence}
                          </Link>
                          <p className="home-record-label">Published External Anchor</p>
                        </div>
                      )}
                    </div>
                  )}

                  <p className="home-record-note">
                    Personal capital deployment. Young sample
                    {proof.sampleSize ? ` n=${proof.sampleSize}` : ''}.
                    {proof.standDownRateLabel !== '-'
                      ? ` Capital in reserve ${proof.standDownRateLabel}.`
                      : ''}
                    {proof.postureAge ? ` ${proof.postureAge}.` : ''}
                  </p>
                </motion.div>
              )}
            </div>
          </motion.div>
        </section>

        <section className="home-vision border-t border-border px-5 py-20 md:py-28">
          <div className="mx-auto max-w-6xl">
            <p className="home-vision-kicker">The Operating Cycle</p>
            <h2 className="home-vision-title">Evaluate. Decide. Lock. Or preserve capital.</h2>
            <p className="home-vision-dek">
              A price target is not an investment thesis. Hermes commits capital only when liquidity, market structure, and macro regime agree. Most of the time, the optimal action is capital preservation.
            </p>

            <ol className="home-vision-ladder">
              <li>
                <span className="home-vision-index">01</span>
                <div>
                  <p className="home-vision-domain">Evaluate</p>
                  <p>
                    Analyzes liquidity paths, order book imbalance, and regime dynamics across timeframes to determine if market conditions support capital deployment.
                  </p>
                </div>
              </li>
              <li>
                <span className="home-vision-index">02</span>
                <div>
                  <p className="home-vision-domain">Decide</p>
                  <p>
                    Determines exact asset allocation, exposure scaling, invalidation levels, and exit conditions. If regime stability breaks down, Hermes stands down into cash reserves.
                  </p>
                </div>
              </li>
              <li>
                <span className="home-vision-index">03</span>
                <div>
                  <p className="home-vision-domain">Lock</p>
                  <p>
                    The decision parameter is written to an immutable public chain before capital moves. Changing an old entry breaks the cryptographic chain.
                  </p>
                </div>
              </li>
            </ol>
          </div>
        </section>

        {timeline.length > 0 && (
          <section className="border-t border-border px-5 py-20 md:py-28">
            <div className="mx-auto max-w-6xl">
              <p className="home-vision-kicker">Audit Trail</p>
              <h2 className="home-vision-title">Recent allocation decisions.</h2>
              <p className="home-vision-dek">
                Immutable entries from the public decision ledger. Not a backtest or hypothetical curve.
              </p>

              <ol className="home-seals">
                {timeline.map((entry) => (
                  <li key={`${entry.time}-${entry.action}`}>
                    <time>{entry.time}</time>
                    <div>
                      <p className="home-seals-action">{entry.action}</p>
                      <p className="home-seals-detail">{entry.detail}</p>
                    </div>
                    <p className="home-seals-outcome">{entry.outcome}</p>
                  </li>
                ))}
              </ol>

              <div className="mt-10">
                <Link
                  href={OBSERVATORY_HERMES_LEDGER_PATH}
                  className="text-sm underline decoration-foreground/20 underline-offset-4 transition-all hover:decoration-foreground/60"
                >
                  Open full decision ledger
                </Link>
              </div>
            </div>
          </section>
        )}

        <section className="border-t border-border px-5 py-20 md:py-28">
          <div className="mx-auto max-w-6xl">
            <p className="home-vision-kicker">System Details</p>
            <dl className="home-faq">
              {faqItems.map((item) => (
                <div key={item.q}>
                  <dt>{item.q}</dt>
                  <dd>{item.a}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-10 max-w-xl text-sm leading-relaxed text-muted">
              Solace is built and operated by <span className="text-foreground">Kerby Jean</span>. Hermes deploys personal capital to establish an unalterable track record. Nothing on this site constitutes an offer to manage outside funds or financial advice.
            </p>
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <Link
                href="/brief"
                className="text-muted underline decoration-transparent underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground/30"
              >
                Read the brief
              </Link>
              <Link
                href="/"
                className="text-muted underline decoration-transparent underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground/30"
              >
                Solace
              </Link>
            </div>
          </div>
        </section>

        <SiteFooter />
      </main>
    </HermesOnboardingProvider>
  );
}