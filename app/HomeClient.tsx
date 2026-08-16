'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';

import SiteFooter from '@/components/site-footer';
import SiteHeader from '@/components/site-header';
import type { HermesLedgerRow } from '@/features/hermes-ledger/store';
import { OBSERVATORY_HERMES_LEDGER_PATH } from '@/features/observatory/paths';
import { isInAppNavigationAnchor, setWebglPaused } from '@/lib/webgl-lifecycle';

import HermesDashboardPreview from './HermesDashboardPreview';
import HermesLiquidityFieldRender from './HermesLiquidityFieldRender';
import OracleOrbSection from './OracleOrbSection';
import type { ActivePrediction } from './oracle/active-predictions';

const easeOut = [0.16, 1, 0.3, 1] as [number, number, number, number];

const fade = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: easeOut } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

// Animated word
const wordColors = {
  financial: 'from-emerald-400 to-teal-400',
  prediction: 'from-blue-400 to-indigo-400',
  humanitarian: 'from-rose-400 to-pink-400',
};

function AnimatedWord({ word }: { word: string }) {
  const colorClass = wordColors[word as keyof typeof wordColors] || 'from-gray-400 to-gray-400';

  return (
    <motion.span
      key={word}
      initial={{ opacity: 0, y: 20, scale: 0.8, rotate: -4 }}
      animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
      exit={{ opacity: 0, y: -20, scale: 0.8, rotate: 4 }}
      transition={{ duration: 0.55, ease: [0.34, 1.56, 0.64, 1] }}
      className={`inline-block bg-gradient-to-r ${colorClass} bg-clip-text text-transparent`}
      style={{ textShadow: '0 0 40px rgba(255,255,255,0.15)' }}
    >
      {word}
    </motion.span>
  );
}

export type HermesTelemetry = {
  posture: string;
  reason?: string;
  condition?: string;
  deployedCount?: number;
  pathsCount: number;
  pathsLabel: string;
  updatedAt: string;
};

export type ChainHeadSummary = {
  rowNumber: number;
  recordId: string;
  hash: string;
  prevHash?: string;
  sealedAtLabel: string;
};

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
  recentDecisions = [],
  oraclePredictions = [],
}: {
  hermesTelemetry: HermesTelemetry | null;
  sealedDecisions: number | null;
  chainHead?: ChainHeadSummary | null;
  anchor?: AnchorStatus | null;
  recentDecisions?: HermesLedgerRow[];
  oraclePredictions?: ActivePrediction[];
}) {
  const reduceMotion = useReducedMotion();
  const heroInitial = reduceMotion ? false : 'hidden';

  const words = ['financial', 'prediction', 'aids'];
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((i) => (i + 1) % words.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [words.length]);

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
          {/* ✅ CENTERED CONTAINER */}
          <div className="hero-particle-copy home-hero-copy max-w-3xl mx-auto text-center">
            {/* <motion.p variants={fade} className="hero-particle-eyebrow">
              Solace
            </motion.p> */}

            {/* Title – explicitly centered */}
            <motion.h1
              variants={fade}
              className="hero-particle-title home-hero-title is-mission text-center"
            >
              Machines that make{' '}
              <span className="inline-flex justify-center min-w-[120px] text-center relative">
                <span
                  className="absolute inset-0 blur-2xl opacity-30 rounded-full"
                  style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%)' }}
                />
                <AnimatePresence mode="wait">
                  <AnimatedWord word={words[wordIndex]} />
                </AnimatePresence>
              </span>{' '}
              decisions for you.
            </motion.h1>

            <motion.p variants={fade} className="home-hero-subline text-lg font-medium text-foreground/90">
              Hermes is the first one. It manages money and makes market decisions on your behalf.
            </motion.p>
            <motion.p variants={fade} className="home-hero-dek text-muted mt-3">
              Every decision is recorded, timestamped, and publicly verified in real time.
            </motion.p>

            <motion.div variants={fade} className="hero-particle-ctas mt-8 flex justify-center gap-4">
              <Link href={OBSERVATORY_HERMES_LEDGER_PATH} className="hero-cta hero-cta-primary hero-cta-on-void">
                Watch what it actually does
              </Link>
              <Link href="/hermes" className="hero-cta hero-cta-secondary hero-cta-on-void">
                Run a simulation
              </Link>
            </motion.div>
          </div>
        </motion.div>

        {showRecord && (
          <motion.div
            initial={heroInitial}
            animate="show"
            variants={fade}
            className="home-record-band relative z-10 mx-auto max-w-6xl px-5 pb-16 md:pb-24"
            aria-label="Live Hermes record"
          >
            <div className="home-record">
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
                    <p className="home-record-label">Sealed Decisions</p>
                  </div>
                  {chainHead && (
                    <div>
                      <p className="home-record-meta">{chainHead.sealedAtLabel}</p>
                      <p className="home-record-label">Last Seal</p>
                    </div>
                  )}
                  {anchor && (
                    <div>
                      <Link href={anchor.href ?? '/anchor'} className="home-record-meta home-record-link">
                        {anchor.cadence}
                      </Link>
                      <p className="home-record-label">Public Verification</p>
                    </div>
                  )}
                </div>
              )}

              <p className="home-record-note">
                Founder capital. Young sample.
                {chainHead ? ` Row ${chainHead.rowNumber}.` : ''}
              </p>
            </div>
          </motion.div>
        )}
      </section>

      {/* Hermes & Oracle Grid */}
      <section className="px-5 py-12 md:py-16">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="group relative flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#121214] p-6 shadow-2xl transition-all duration-300 hover:border-white/20">
              <h3 className="mb-3 font-mono text-xs font-medium uppercase tracking-widest text-white/60">
                Hermes
              </h3>
              <div className="flex-1">
                <HermesDashboardPreview decisions={recentDecisions} />
              </div>
              <div className="mt-4 flex items-center justify-end text-xs text-white/50">
                <Link
                  href="/hermes"
                  className="flex items-center gap-1 text-white/60 transition-colors hover:text-white"
                >
                  Explore Hermes <span className="text-sm">→</span>
                </Link>
              </div>
            </div>

            <div className="group relative flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#121214] p-6 shadow-2xl transition-all duration-300 hover:border-white/20">
              <h3 className="mb-3 font-mono text-xs font-medium uppercase tracking-widest text-white/60">
                Oracle
              </h3>
              <div className="flex-1">
                <OracleOrbSection predictions={oraclePredictions} />
              </div>
              <div className="mt-4 flex items-center justify-end text-xs text-white/50">
                <Link
                  href="/oracle"
                  className="flex items-center gap-1 text-white/60 transition-colors hover:text-white"
                >
                  Explore Oracle <span className="text-sm">→</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="home-vision border-t border-border px-5 py-20 md:py-28">
        <div className="mx-auto max-w-6xl">
          <p className="home-vision-kicker">The Machinery Underneath</p>
          <h2 className="home-vision-title">Observation, execution, and public proof.</h2>
          <p className="home-vision-dek">
            Making decisions without human bias requires high-density infrastructure. 
            Solace connects liquidity models, regime detection, execution, and risk management to a cryptographically sealed feedback loop.
          </p>

          <ol className="home-vision-ladder mt-12">
            <li>
              <span className="home-vision-index">01</span>
              <div>
                <p className="home-vision-domain">Hermes (Markets)</p>
                <p>
                  Reads order flow, volatility, and structure to decide whether to allocate, how much, and when to exit. Every decision is sealed on-chain before the trade executes.
                </p>
              </div>
            </li>
            <li>
              <span className="home-vision-index">02</span>
              <div>
                <p className="home-vision-domain">Oracle (Belief & Probability)</p>
                <p>
                  Writes a probability state before an event resolves and scores it against real-world outcomes. Continuous calibration replaces guesswork.
                </p>
              </div>
            </li>
            <li>
              <span className="home-vision-index">03</span>
              <div>
                <p className="home-vision-domain">Glorya (Allocation & Need)</p>
                <p>
                  Evaluates real world demand and resource paths. It remains inactive until Solace crosses $1M cumulative revenue.
                </p>
              </div>
            </li>
          </ol>
        </div>
      </section>

      <section className="border-t border-border px-5 py-16 md:py-20">
        <div className="mx-auto max-w-6xl">
          <p className="max-w-xl text-sm leading-relaxed text-muted">
            Solace is built by <span className="text-foreground">Kerby Jean</span>.
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
