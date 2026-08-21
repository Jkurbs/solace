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
                Hermes
              </motion.p>

              <motion.h1 variants={fade} className="hero-particle-title home-hero-title">
                Instrument that looks at markets and decides whether to put money in, take it out, or wait.
              </motion.h1>

              <motion.p variants={fade} className="home-hero-dek">
                Each decision is written before the outcome is known. You cannot invest yet. Run a
                simulation with fake money, or check the live record.
              </motion.p>

              <motion.div variants={fade} className="hero-particle-ctas is-start mb-10 mt-6">
                <ExperienceHermesButton className="hero-cta hero-cta-primary">
                  Run a simulation
                </ExperienceHermesButton>
                <ShimmerLink href={OBSERVATORY_HERMES_LEDGER_PATH} className="hero-cta hero-cta-secondary">
                  Check the live record
                </ShimmerLink>
              </motion.div>

              {showRecord && (
                <motion.div variants={fade} className="home-record" aria-label="Live Hermes record">
                  {(proof.condition || proof.posture || proof.reason) && (
                    <div className="home-record-readout">
                      {proof.condition && (
                        <div>
                          <p className="home-record-label">Market</p>
                          <p className="home-record-value">{proof.condition}</p>
                        </div>
                      )}
                      {proof.posture && (
                        <div>
                          <p className="home-record-label">Now</p>
                          <p className="home-record-value">{proof.posture}</p>
                        </div>
                      )}
                      {proof.reason && (
                        <div>
                          <p className="home-record-label">Why</p>
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
                          <p className="home-record-meta">{proof.standDownRateLabel}</p>
                          <p className="home-record-label">Standing down</p>
                        </div>
                      )}
                      {proof.hitRateLabel !== '-' && (
                        <div>
                          <p className="home-record-meta">{proof.hitRateLabel}</p>
                          <p className="home-record-label">
                            Win rate · n={proof.positive + proof.negative}
                          </p>
                        </div>
                      )}
                      {proof.expectancy !== null && (
                        <div>
                          <p className="home-record-meta">{formatPercent(proof.expectancy, 1)}</p>
                          <p className="home-record-label">
                            Expectancy{proof.sampleSize > 0 ? ` · n=${proof.sampleSize}` : ''}
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
                          <p className="home-record-label">Published outside our servers</p>
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

        <section className="home-vision border-t border-border px-5 py-20 md:py-28">
          <div className="mx-auto max-w-6xl">
            <p className="home-vision-kicker">How it works</p>
            <h2 className="home-vision-title">Look. Decide. Write it down. Or wait.</h2>
            <p className="home-vision-dek">
              Hermes looks at markets, then either puts money in or stays in cash. Most of the time, it waits. The
              choice is written down before anything happens.
            </p>

            <ol className="home-vision-ladder">
              <li>
                <span className="home-vision-index">01</span>
                <div>
                  <p className="home-vision-domain">Look</p>
                  <p>
                    It reads whether the market is clear enough to put money in. If it is not, Hermes waits.
                  </p>
                </div>
              </li>
              <li>
                <span className="home-vision-index">02</span>
                <div>
                  <p className="home-vision-domain">Decide</p>
                  <p>
                    If it acts, it chooses what to hold, how much, and when it would get out. If that stops being true,
                    it goes back to cash.
                  </p>
                </div>
              </li>
              <li>
                <span className="home-vision-index">03</span>
                <div>
                  <p className="home-vision-domain">Write it down</p>
                  <p>
                    The decision is published before money moves. After that, nobody can quietly change what was
                    decided.
                  </p>
                </div>
              </li>
            </ol>
          </div>
        </section>

        {timeline.length > 0 && (
          <section className="border-t border-border px-5 py-20 md:py-28">
            <div className="mx-auto max-w-6xl">
              <p className="home-vision-kicker">Recent decisions</p>
              <h2 className="home-vision-title">From the public record.</h2>
              <p className="home-vision-dek">
                Sealed before the outcome. Not a backtest.
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