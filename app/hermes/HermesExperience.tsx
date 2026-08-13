'use client';

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
    q: 'Is this a trading bot I can use?',
    a: 'No. Hermes is a decision system Solace operates. You can watch the public record, or run a simulation with fake money that follows the same decisions.',
  },
  {
    q: 'Can I invest with Hermes?',
    a: 'Not yet. Hermes runs founder capital only. Real allocation, if it opens, will start with people on the waitlist.',
  },
  {
    q: 'How is this different from a hedge fund?',
    a: 'Hermes does not manage outside capital. It does not charge fees. Every decision is sealed on a public record before the trade.',
  },
  {
    q: 'Can I see the exact trades?',
    a: 'You can inspect sealed decisions, outcomes, and process. Execution detail that would reveal the recipe stays private. The chain is still checkable by math.',
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
                Hermes · founder capital
              </motion.p>

              <motion.h1 variants={fade} className="hero-particle-title home-hero-title">
                <span className="home-hero-line">Hermes reads the structure.</span>
                <span className="home-hero-line home-hero-line-2">Then it allocates — or it waits.</span>
              </motion.h1>

              <motion.p variants={fade} className="home-hero-dek">
                It reads liquidity, volatility, and regime, then decides whether to allocate capital,
                how much, and when to exit. Every decision is sealed on a public record before the
                trade. Founder capital only. You cannot invest yet.
              </motion.p>

              <motion.div variants={fade} className="hero-particle-ctas mb-10 md:mb-14">
                <ExperienceHermesButton className="hero-cta hero-cta-primary">
                  Run a simulation
                </ExperienceHermesButton>
                <Link href={OBSERVATORY_HERMES_LEDGER_PATH} className="hero-cta hero-cta-secondary">
                  Open the public record
                </Link>
              </motion.div>

              {showRecord && (
                <motion.div variants={fade} className="home-record" aria-label="Live Hermes record">
                  {(proof.condition || proof.posture || proof.reason) && (
                    <div className="home-record-readout">
                      {proof.condition && (
                        <div>
                          <p className="home-record-label">Condition</p>
                          <p className="home-record-value">{proof.condition}</p>
                        </div>
                      )}
                      {proof.posture && (
                        <div>
                          <p className="home-record-label">Decision</p>
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
                      {proof.hitRateLabel !== '-' && (
                        <div>
                          <p className="home-record-meta">{proof.hitRateLabel}</p>
                          <p className="home-record-label">Hit rate · n={proof.sampleSize}</p>
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
                    {proof.standDownRateLabel !== '-'
                      ? ` Standing down ${proof.standDownRateLabel}.`
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
            <p className="home-vision-kicker">The loop</p>
            <h2 className="home-vision-title">Read. Decide. Seal. Or stand down.</h2>
            <p className="home-vision-dek">
              A price destination is not a path. Hermes commits only when liquidity, timing, and
              regime agree. Most of the time, the correct action is none.
            </p>

            <ol className="home-vision-ladder">
              <li>
                <span className="home-vision-index">01</span>
                <div>
                  <p className="home-vision-domain">Read</p>
                  <p>
                    Liquidity, volatility, and regime across timeframes. Not a forecast of the next
                    tick — a read of whether the field can carry a position.
                  </p>
                </div>
              </li>
              <li>
                <span className="home-vision-index">02</span>
                <div>
                  <p className="home-vision-domain">Decide</p>
                  <p>
                    Whether to allocate, how much, where it is invalid, and when to exit. If the
                    regime breaks character, Hermes stands down.
                  </p>
                </div>
              </li>
              <li>
                <span className="home-vision-index">03</span>
                <div>
                  <p className="home-vision-domain">Seal</p>
                  <p>
                    The decision is written to a public chain before the trade moves. Changing an
                    old row breaks the hash. You can check it.
                  </p>
                </div>
              </li>
            </ol>
          </div>
        </section>

        {timeline.length > 0 && (
          <section className="border-t border-border px-5 py-20 md:py-28">
            <div className="mx-auto max-w-6xl">
              <p className="home-vision-kicker">Recent seals</p>
              <h2 className="home-vision-title">The last decisions, as written.</h2>
              <p className="home-vision-dek">
                Real rows from the public record. Not a backtest. Not an illustration.
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
                  Open the full record
                </Link>
              </div>
            </div>
          </section>
        )}

        <section className="border-t border-border px-5 py-20 md:py-28">
          <div className="mx-auto max-w-6xl">
            <p className="home-vision-kicker">What this is</p>
            <dl className="home-faq">
              {faqItems.map((item) => (
                <div key={item.q}>
                  <dt>{item.q}</dt>
                  <dd>{item.a}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-10 max-w-xl text-sm leading-relaxed text-muted">
              Solace is one person — <span className="text-foreground">Kerby Jean</span>. Hermes
              operates on founder capital. Nothing here is an offer to manage funds.
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
