'use client';

import React from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';

import { ShimmerLink } from '@/components/shimmer-link';
import SiteFooter from '@/components/site-footer';
import SiteHeader from '@/components/site-header';
import { formatPercent } from '@/features/hermes-ledger/scoreboard';
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
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: easeOut },
  },
};

const stagger = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08, delayChildren: 0.06 },
  },
};

const faqItems = [
  {
    q: 'Does Hermes own my capital?',
    a: 'No. Hermes is designed to operate with delegated authority rather than ownership. Capital remains in an individually controlled account while Hermes operates within explicit execution and risk constraints.',
  },
  {
    q: 'What does Hermes actually do?',
    a: 'Hermes observes markets, decides when capital should act, determines how much to allocate, and manages the position as conditions change. When the conditions are not clear enough, Hermes can simply wait.',
  },
  {
    q: 'What makes Hermes different from a traditional investment manager?',
    a: 'Hermes separates capital ownership from financial decision-making. The system can make and execute decisions without requiring capital to be transferred into a pooled account.',
  },
  {
    q: 'Why publish decisions before the outcome?',
    a: 'Because a performance record is more meaningful when the decision existed before the result. Hermes seals decisions before execution, creating a verifiable history rather than reconstructing its reasoning after the fact.',
  },
  {
    q: 'What does "verifiable by math" mean?',
    a: 'Before execution, Hermes records the decision and its parameters and anchors that record externally. This creates evidence that the decision existed before the outcome occurred.',
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
    proof.sealedDecisions > 0 ||
    Boolean(proof.condition || proof.posture || proof.reason);

  const timeline = proof.timeline.slice(0, 5);
  const lastSeal = timeline[0]?.time ?? null;

  return (
    <HermesOnboardingProvider>
      <main className="home-research min-h-screen bg-background pt-16 text-foreground antialiased selection:bg-foreground/10">
        <SiteHeader />

        {/* Hero */}
        <section className="hero-research px-5 pt-16 pb-20 md:pt-24 md:pb-28">
          <motion.div
            className="mx-auto max-w-6xl"
            initial={heroInitial}
            animate="show"
            variants={stagger}
          >
            <div className="home-hero-copy">
              <motion.p variants={fade} className="hero-particle-eyebrow">
                Hermes
              </motion.p>

              <motion.h1
                variants={fade}
                className="hero-particle-title home-hero-title"
              >
                An autonomous decision instrument for capital.
              </motion.h1>

              <motion.p variants={fade} className="home-hero-dek">
                Hermes observes markets, decides when capital should act, and
                executes within explicit constraints. The capital remains yours.
                Hermes receives permission to act—not ownership.
              </motion.p>

              <motion.div
                variants={fade}
                className="hero-particle-ctas is-start mb-10 mt-6"
              >
                <ExperienceHermesButton className="hero-cta hero-cta-primary">
                  Run a simulation
                </ExperienceHermesButton>

                <ShimmerLink
                  href={OBSERVATORY_HERMES_LEDGER_PATH}
                  className="hero-cta hero-cta-secondary"
                >
                  Check the live record
                </ShimmerLink>
              </motion.div>

              {showRecord && (
                <motion.div
                  variants={fade}
                  className="home-record"
                  aria-label="Live Hermes record"
                >
                  {(proof.condition || proof.posture || proof.reason) && (
                    <div className="home-record-readout">
                      {proof.condition && (
                        <div>
                          <p className="home-record-label">Market</p>
                          <p className="home-record-value">
                            {proof.condition}
                          </p>
                        </div>
                      )}

                      {proof.posture && (
                        <div>
                          <p className="home-record-label">Now</p>
                          <p className="home-record-value">
                            {proof.posture}
                          </p>
                        </div>
                      )}

                      {proof.reason && (
                        <div>
                          <p className="home-record-label">Why</p>
                          <p className="home-record-value home-record-value-quiet">
                            {proof.reason}
                          </p>
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
                        <p className="home-record-label">Sealed</p>
                      </div>

                      {lastSeal && (
                        <div>
                          <p className="home-record-meta">{lastSeal}</p>
                          <p className="home-record-label">Last seal</p>
                        </div>
                      )}

                      {proof.standDownRateLabel !== '-' && (
                        <div>
                          <p className="home-record-meta">
                            {proof.standDownRateLabel}
                          </p>
                          <p className="home-record-label">
                            Standing down
                          </p>
                        </div>
                      )}

                      {proof.hitRateLabel !== '-' && (
                        <div>
                          <p className="home-record-meta">
                            {proof.hitRateLabel}
                          </p>
                          <p className="home-record-label">
                            Win rate · n={proof.positive + proof.negative}
                          </p>
                        </div>
                      )}

                      {proof.expectancy !== null && (
                        <div>
                          <p className="home-record-meta">
                            {formatPercent(proof.expectancy, 1)}
                          </p>
                          <p className="home-record-label">
                            Expectancy
                            {proof.sampleSize > 0
                              ? ` · n=${proof.sampleSize}`
                              : ''}
                          </p>
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
                          <p className="home-record-label">
                            Published outside our servers
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <p className="home-record-note">
                    Founder capital. Young sample
                    {proof.sampleSize ? ` n=${proof.sampleSize}` : ''}.
                    {proof.postureAge ? ` ${proof.postureAge}.` : ''}
                  </p>
                </motion.div>
              )}
            </div>
          </motion.div>
        </section>

        {/* Core thesis */}
        <section className="home-vision border-t border-border px-5 py-20 md:py-28">
          <div className="mx-auto max-w-6xl">
            <p className="home-vision-kicker">The idea</p>

            <h2 className="home-vision-title">
              The capital remains yours. The intelligence does the work.
            </h2>

            <p className="home-vision-dek">
              Traditional asset management often combines ownership,
              authority, and decision-making. Hermes separates them. You own
              the capital. Hermes provides the intelligence. The account
              enforces the boundaries.
            </p>

            <ol className="home-vision-ladder">
              <li>
                <span className="home-vision-index">01</span>
                <div>
                  <p className="home-vision-domain">Ownership</p>
                  <p>
                    Capital remains in an individually controlled account.
                    Hermes does not need ownership of the assets to operate on
                    them.
                  </p>
                </div>
              </li>

              <li>
                <span className="home-vision-index">02</span>
                <div>
                  <p className="home-vision-domain">Intelligence</p>
                  <p>
                    Hermes continuously observes markets and determines when
                    capital should act, how much to allocate, and when the
                    decision should change.
                  </p>
                </div>
              </li>

              <li>
                <span className="home-vision-index">03</span>
                <div>
                  <p className="home-vision-domain">Authority</p>
                  <p>
                    Hermes operates through explicit constraints. It receives
                    permission to act—not unrestricted control of the account.
                  </p>
                </div>
              </li>

              <li>
                <span className="home-vision-index">04</span>
                <div>
                  <p className="home-vision-domain">Proof</p>
                  <p>
                    The decision is sealed before the outcome is known. What
                    Hermes decided, and when it decided it, becomes part of a
                    verifiable record.
                  </p>
                </div>
              </li>
            </ol>
          </div>
        </section>

        {/* Decision loop */}
        <section className="border-t border-border px-5 py-20 md:py-28">
          <div className="mx-auto max-w-6xl">
            <p className="home-vision-kicker">The decision loop</p>

            <h2 className="home-vision-title">
              Observe. Decide. Execute. Record.
            </h2>

            <p className="home-vision-dek">
              Hermes is not built around generating signals for someone else to
              trade. It is built around making a decision, acting on that
              decision, and preserving the record of what happened.
            </p>

            <ol className="home-vision-ladder">
              <li>
                <span className="home-vision-index">01</span>
                <div>
                  <p className="home-vision-domain">Observe</p>
                  <p>
                    Hermes reads the market and determines whether conditions
                    are clear enough to justify risk.
                  </p>
                </div>
              </li>

              <li>
                <span className="home-vision-index">02</span>
                <div>
                  <p className="home-vision-domain">Decide</p>
                  <p>
                    If Hermes acts, it defines the position, allocation, and
                    conditions that would invalidate the decision. If the
                    opportunity is not clear, it waits.
                  </p>
                </div>
              </li>

              <li>
                <span className="home-vision-index">03</span>
                <div>
                  <p className="home-vision-domain">Execute</p>
                  <p>
                    The decision is carried out through constrained authority,
                    allowing Hermes to operate without taking ownership of the
                    underlying capital.
                  </p>
                </div>
              </li>

              <li>
                <span className="home-vision-index">04</span>
                <div>
                  <p className="home-vision-domain">Record</p>
                  <p>
                    The decision is written before the outcome is known. The
                    resulting history can be inspected rather than simply
                    trusted.
                  </p>
                </div>
              </li>
            </ol>
          </div>
        </section>

        {/* Public record */}
        {timeline.length > 0 && (
          <section className="border-t border-border px-5 py-20 md:py-28">
            <div className="mx-auto max-w-6xl">
              <p className="home-vision-kicker">Public record</p>

              <h2 className="home-vision-title">
                Don't trust the story. Check the record.
              </h2>

              <p className="home-vision-dek">
                Decisions are sealed before the outcome. The record is not a
                backtest and does not depend on reconstructing history after
                the fact.
              </p>

              <ol className="home-seals">
                {timeline.map((entry) => (
                  <li key={`${entry.time}-${entry.action}`}>
                    <time>{entry.time}</time>

                    <div>
                      <p className="home-seals-action">{entry.action}</p>
                      <p className="home-seals-detail">{entry.detail}</p>
                    </div>

                    <p className="home-seals-outcome">
                      {entry.outcome}
                    </p>
                  </li>
                ))}
              </ol>

              <div className="mt-10">
                <ShimmerLink
                  href={OBSERVATORY_HERMES_LEDGER_PATH}
                  tone="ink"
                  className="text-sm underline decoration-foreground/20 underline-offset-4 transition-all hover:decoration-foreground/60"
                >
                  Check the live record
                </ShimmerLink>
              </div>
            </div>
          </section>
        )}

        {/* FAQ / System details */}
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
              Solace is built and operated by{' '}
              <span className="text-foreground">Kerby Jean</span>. Hermes
              deploys personal capital to establish an unalterable track
              record. Nothing on this site constitutes an offer to manage
              outside funds or financial advice.
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
