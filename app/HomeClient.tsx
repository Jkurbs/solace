'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

import SiteFooter from '@/components/site-footer';
import SiteHeader from '@/components/site-header';
import type { HermesLedgerRow } from '@/features/hermes-ledger/store';
import { OBSERVATORY_HERMES_LEDGER_PATH } from '@/features/observatory/paths';
import { isInAppNavigationAnchor, setWebglPaused } from '@/lib/webgl-lifecycle';

import HermesDashboardPreview from './HermesDashboardPreview';
import HermesLiquidityFieldRender from './HermesLiquidityFieldRender';
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

  // Grab the latest 3 active predictions for the compact view
  const latestPredictions = oraclePredictions.slice(0, 3);

  return (
    <main className="home-research min-h-screen bg-[#080809] pt-16 text-foreground antialiased selection:bg-foreground/10">
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
          className="hero-particle-layout relative z-10 mx-auto max-w-7xl px-5 pt-14 pb-16 md:pt-20 md:pb-20"
        >
          <div className="hero-particle-copy home-hero-copy max-w-3xl">
            <motion.p variants={fade} className="hero-particle-eyebrow font-mono text-xs text-white/50 uppercase tracking-widest">
              Solace
            </motion.p>

            <motion.h1 variants={fade} className="hero-particle-title home-hero-title is-mission">
              Machines that make decisions for you.
            </motion.h1>

            <motion.p variants={fade} className="home-hero-subline text-lg font-medium text-foreground/90">
              Hermes is the first one. It manages capital and makes market decisions on your behalf.
            </motion.p>

            <motion.p variants={fade} className="home-hero-dek text-muted mt-3">
              Every decision is recorded, timestamped, and publicly verified in real time.
            </motion.p>

            <motion.div variants={fade} className="hero-particle-ctas mt-8">
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
            className="home-record-band relative z-10 mx-auto max-w-7xl px-5 pb-12 md:pb-16"
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

      {/* Grid Container */}
      <section className="px-5 py-12 md:py-16">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            
            {/* Hermes Execution Card */}
            <div className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-white/10 bg-[#121214] p-5 shadow-2xl transition-all duration-300 hover:border-white/20">
              <div className="flex-1 overflow-hidden pb-6">
                <HermesDashboardPreview decisions={recentDecisions} />
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-white/50 border-t border-white/5 pt-4">
                <span className="font-medium text-white/80">Hermes</span>
                <Link
                  href={OBSERVATORY_HERMES_LEDGER_PATH}
                  className="flex items-center gap-1 text-white/60 transition-colors hover:text-white"
                >
                  Explore <span className="text-sm">→</span>
                </Link>
              </div>
            </div>

            {/* Oracle Card: Streamlined to Latest Predictions + Action Button */}
            <div className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-white/10 bg-[#121214] p-6 shadow-2xl transition-all duration-300 hover:border-white/20">
              <div className="flex flex-col gap-5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs uppercase tracking-wider text-white/40">Latest Predictions</span>
                  <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>

                <div className="flex flex-col gap-3">
                  {latestPredictions.length > 0 ? (
                    latestPredictions.map((pred, idx) => (
                      <div
                        key={pred.id || idx}
                        className="flex flex-col gap-1.5 rounded-2xl border border-white/5 bg-black/30 p-3.5 transition-colors hover:border-white/10"
                      >
                        <p className="line-clamp-2 text-xs font-medium text-white/90 leading-snug">
                          {pred.title || pred.question}
                        </p>
                        <div className="flex items-center justify-between text-[11px] text-white/50 font-mono">
                          <span>Probability</span>
                          <span className="font-semibold text-emerald-400">
                            {typeof pred.probability === 'number' ? `${(pred.probability * 100).toFixed(0)}%` : pred.probability}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-white/5 bg-black/20 p-4 text-center text-xs text-white/40">
                      No active predictions loaded.
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between text-xs text-white/50 border-t border-white/5 pt-4">
                <span className="font-medium text-white/80">Oracle</span>
                <Link
                  href="/oracle"
                  className="flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 font-medium text-white transition-all hover:bg-white/20"
                >
                  Explore <span className="text-sm">→</span>
                </Link>
              </div>
            </div>

            {/* Cryptographic Proof Card */}
            <div className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-white/10 bg-[#121214] p-6 shadow-2xl transition-all duration-300 hover:border-white/20 md:col-span-2 lg:col-span-1">
              <div className="flex flex-col gap-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-400 w-fit">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Ledger
                </div>
                <h3 className="text-xl font-medium tracking-tight text-white">Cryptographic Decision Ledger</h3>
                <p className="text-sm leading-relaxed text-white/60">
                  Hermes hashes every market evaluation and order stream into an immutable SHA-256 chain prior to execution.
                </p>
                <div className="mt-2 rounded-xl border border-white/5 bg-black/40 p-4 font-mono text-xs text-white/40">
                  <p className="text-white/60"># Head Seal</p>
                  <p className="truncate text-white/80">{chainHead?.hash ?? 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}</p>
                </div>
              </div>
              <div className="mt-8 flex items-center justify-between text-xs text-white/50 border-t border-white/5 pt-4">
                <span className="font-medium text-white/80">Proof</span>
                <Link
                  href="/anchor"
                  className="flex items-center gap-1 text-white/60 transition-colors hover:text-white"
                >
                  Explore <span className="text-sm">→</span>
                </Link>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Machinery Section */}
      <section className="home-vision border-t border-white/10 px-5 py-20 md:py-28">
        <div className="mx-auto max-w-7xl">
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
                  Reads order flow, volatility, and structure to decide whether to allocate, how much, and when to exit. Every decision is sealed on-chain before execution.
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

      <section className="border-t border-white/10 px-5 py-16 md:py-20">
        <div className="mx-auto max-w-7xl">
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