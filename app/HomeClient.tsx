'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

import SiteFooter from '@/components/site-footer';
import SiteHeader from '@/components/site-header';
import { OBSERVATORY_HERMES_LEDGER_PATH } from '@/features/observatory/paths';
import { isInAppNavigationAnchor, setWebglPaused } from '@/lib/webgl-lifecycle';

import HermesLiquidityFieldRender from './HermesLiquidityFieldRender';

const easeOut = [0.16, 1, 0.3, 1] as [number, number, number, number];

const fade = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: easeOut } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

export type HermesTelemetry = {
  posture: string;
  reason?: string;
  condition?: string;
  deployedCount?: number;
  pathsCount: number;
  pathsLabel: string;
  updatedAt: string;
};

/** Latest sealed ledger row — the hero artifact. Wire from the ledger feed. */
export type ChainHeadSummary = {
  rowNumber: number;
  recordId: string;
  /** Full or shortened hash; displayed as-is. */
  hash: string;
  prevHash?: string;
  /** Pre-formatted, e.g. "Aug 8, 2026, 12:50 AM EDT". */
  sealedAtLabel: string;
};

/** External anchor status. */
export type AnchorStatus = {
  cadence: string;
  lastAnchoredLabel?: string;
  href?: string;
};

function formatConstant(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

export default function HomeClient({
  hermesTelemetry,
  sealedDecisions,
  chainHead = null,
  anchor = null,
}: {
  hermesTelemetry: HermesTelemetry | null;
  sealedDecisions: number | null;
  chainHead?: ChainHeadSummary | null;
  anchor?: AnchorStatus | null;
}) {
  const reduceMotion = useReducedMotion();
  const heroInitial = reduceMotion ? false : 'hidden';

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const target = e.target;
      if (!(target instanceof Element)) return;
      const link = target.closest('a[href]');
      if (!(link instanceof HTMLAnchorElement)) return;
      if (!isInAppNavigationAnchor(link)) return;
      setWebglPaused(true);
    };
    const onShow = () => setWebglPaused(false);
    const onVis = () => {
      if (document.visibilityState === 'visible') setWebglPaused(false);
    };
    document.addEventListener('click', onClick, true);
    window.addEventListener('pageshow', onShow);
    document.addEventListener('visibilitychange', onVis);
    setWebglPaused(false);
    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('pageshow', onShow);
      document.removeEventListener('visibilitychange', onVis);
      setWebglPaused(false);
    };
  }, []);

  const showRecord =
    (sealedDecisions != null && sealedDecisions > 0) ||
    Boolean(hermesTelemetry?.condition || hermesTelemetry?.posture || hermesTelemetry?.reason);

  return (
    <main className="home-research min-h-screen bg-background pt-16 text-foreground antialiased selection:bg-foreground/10">
      <SiteHeader />

      <section className="hero-research hero-particle-section relative overflow-hidden">
        <div className="hero-particle-stage absolute inset-0 w-full h-full overflow-hidden pointer-events-none" aria-hidden="true">
          <HermesLiquidityFieldRender maxParticles={30000} />
          <div className="hero-particle-vignette absolute inset-0 pointer-events-none" />
        </div>

        <motion.div
          initial={heroInitial}
          animate="show"
          variants={stagger}
          className="hero-particle-layout relative z-10 mx-auto max-w-6xl px-5 pt-14 pb-20 md:pt-24 md:pb-28"
        >
          <div className="hero-particle-copy home-hero-copy">
            <motion.p variants={fade} className="hero-particle-eyebrow">
              Solace
            </motion.p>

            <motion.h1 variants={fade} className="hero-particle-title home-hero-title is-mission">
              Decide under uncertainty.
            </motion.h1>

            <motion.p variants={fade} className="home-hero-subline">
              Most of the time, the right decision is none.
            </motion.p>

            <motion.p variants={fade} className="home-hero-dek">
              We start with money. Every decision is written down before anyone knows if it was
              right. You cannot invest yet.
            </motion.p>

            <motion.div variants={fade} className="hero-particle-ctas">
              <Link href="/hermes" className="hero-cta hero-cta-primary hero-cta-on-void">
                Run a simulation
              </Link>
              <Link
                href={OBSERVATORY_HERMES_LEDGER_PATH}
                className="hero-cta hero-cta-secondary hero-cta-on-void"
              >
                Open the public record
              </Link>
            </motion.div>

            {showRecord && (
              <motion.div variants={fade} className="home-record" aria-label="Live Hermes record">
                {(hermesTelemetry?.condition || hermesTelemetry?.posture || hermesTelemetry?.reason) && (
                  <div className="home-record-readout">
                    {hermesTelemetry?.condition && (
                      <div>
                        <p className="home-record-label">Condition</p>
                        <p className="home-record-value">{hermesTelemetry.condition}</p>
                      </div>
                    )}
                    {hermesTelemetry?.posture && (
                      <div>
                        <p className="home-record-label">Decision</p>
                        <p className="home-record-value">{formatConstant(hermesTelemetry.posture)}</p>
                      </div>
                    )}
                    {hermesTelemetry?.reason && (
                      <div>
                        <p className="home-record-label">Why</p>
                        <p className="home-record-value home-record-value-quiet">{hermesTelemetry.reason}</p>
                      </div>
                    )}
                  </div>
                )}

                {sealedDecisions != null && sealedDecisions > 0 && (
                  <div className="home-record-counts">
                    <div>
                      <p className="home-record-count">{sealedDecisions.toLocaleString('en-US')}</p>
                      <p className="home-record-label">Sealed</p>
                    </div>
                    {chainHead && (
                      <div>
                        <p className="home-record-meta">{chainHead.sealedAtLabel}</p>
                        <p className="home-record-label">Last seal</p>
                      </div>
                    )}
                    {anchor && (
                      <div>
                        <Link href={anchor.href ?? '/anchor'} className="home-record-meta home-record-link">
                          {anchor.cadence}
                        </Link>
                        <p className="home-record-label">Published outside our servers</p>
                      </div>
                    )}
                  </div>
                )}

                <p className="home-record-note">
                  Founder capital. Young sample.
                  {chainHead ? ` Row ${chainHead.rowNumber}.` : ''}
                </p>
              </motion.div>
            )}
          </div>
        </motion.div>
      </section>

      <section className="home-vision border-t border-border px-5 py-20 md:py-28">
        <div className="mx-auto max-w-6xl">
          <p className="home-vision-kicker">The work</p>
          <h2 className="home-vision-title">Capital first. Then belief. Then help.</h2>
          <p className="home-vision-dek">
            Markets compress feedback. They expose a wrong decision in days rather than years, and
            they fund what comes next. Every system follows the same loop: observe, decide, seal,
            stand down when the path is broken.
          </p>

          <ol className="home-vision-ladder">
            <li>
              <span className="home-vision-index">01</span>
              <div>
                <p className="home-vision-domain">Capital</p>
                <p>
                  Hermes is live. It reads liquidity, volatility, and regime, then decides whether
                  to allocate, how much, and when to exit. Every decision is sealed before the
                  trade. Founder capital. Young sample.
                </p>
              </div>
            </li>
            <li>
              <span className="home-vision-index">02</span>
              <div>
                <p className="home-vision-domain">Belief</p>
                <p>
                  Oracle writes a probability before the event resolves, then scores it against
                  what happened. Calibration is the product. The sample is still young.
                </p>
              </div>
            </li>
            <li>
              <span className="home-vision-index">03</span>
              <div>
                <p className="home-vision-domain">Help</p>
                <p>
                  Glorya asks whether need is real and whether a path can carry the money. It does
                  not move capital until Solace has $1M cumulative revenue.
                </p>
              </div>
            </li>
          </ol>
        </div>
      </section>

      <section className="border-t border-border px-5 py-16 md:py-20">
        <div className="mx-auto max-w-6xl">
          <p className="max-w-xl text-sm leading-relaxed text-muted">
            Solace is one person — <span className="text-foreground">Kerby Jean</span>.
          </p>
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <Link
              href="/brief"
              className="text-muted underline decoration-transparent underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground/30"
            >
              Read the brief
            </Link>
            <Link
              href="/research"
              className="text-muted underline decoration-transparent underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground/30"
            >
              Notes
            </Link>
            <a
              href="https://github.com/Jkurbs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted underline decoration-transparent underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground/30"
            >
              GitHub
            </a>
            <a
              href="mailto:hello@solace.fyi"
              className="text-muted underline decoration-transparent underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground/30"
            >
              hello@solace.fyi
            </a>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
