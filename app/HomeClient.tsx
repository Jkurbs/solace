'use client';

import Link from 'next/link';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

import SiteFooter from '@/components/site-footer';
import SiteHeader from '@/components/site-header';
import type { HermesLedgerRow } from '@/features/hermes-ledger/store';
import { OBSERVATORY_HERMES_LEDGER_PATH } from '@/features/observatory/paths';
import { isInAppNavigationAnchor, setWebglPaused } from '@/lib/webgl-lifecycle';

import HermesLiquidityFieldRender from './HermesLiquidityFieldRender';
import type { ActivePrediction } from './oracle/active-predictions';

// ---------- Oracle Q&A Feed ----------
function OracleQnaFeed({ predictions }: { predictions: ActivePrediction[] }) {
  const [displayed, setDisplayed] = useState<ActivePrediction[]>([]);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (predictions.length === 0) return;
    const initialCount = Math.min(3, predictions.length);
    let step = 0;
    const timer = setInterval(() => {
      step += 1;
      setDisplayed(predictions.slice(0, Math.min(step, initialCount)));
      if (step >= initialCount) {
        clearInterval(timer);
        setStarted(true);
      }
    }, 400);
    return () => clearInterval(timer);
  }, [predictions]);

  useEffect(() => {
    if (!started || predictions.length <= 3) return;
    const cycle = setInterval(() => {
      setDisplayed((current) => {
        const next = [...current];
        next.shift();
        const lastId = current[current.length - 1]?.id;
        const lastIndex = predictions.findIndex((p) => p.id === lastId);
        const nextIndex = (lastIndex + 1) % predictions.length;
        next.push(predictions[nextIndex]);
        return next;
      });
    }, 3000);
    return () => clearInterval(cycle);
  }, [started, predictions]);

  if (predictions.length === 0) {
    return <p className="text-sm text-white/40">No active predictions.</p>;
  }

  return (
    <div className="space-y-4">
      <AnimatePresence initial={false} mode="popLayout">
        {displayed.map((p) => (
          <motion.div
            key={p.id}
            layout="position"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="border-b border-white/10 pb-3 last:border-0"
          >
            <p className="text-sm font-medium text-white/90">{p.question}</p>
            <p className="mt-1 text-xs text-white/50">
              {p.asset ? p.asset.toUpperCase() : ''} · {Math.round(p.probability * 100)}% ·{' '}
              {new Date(p.resolvesAt).toLocaleDateString()}
            </p>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ---------- Hermes Decision Feed (plain, no code) ----------
function HermesDecisionFeed({ decisions }: { decisions: HermesLedgerRow[] }) {
  const [displayed, setDisplayed] = useState<HermesLedgerRow[]>([]);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (decisions.length === 0) return;
    const initialCount = Math.min(3, decisions.length);
    let step = 0;
    const timer = setInterval(() => {
      step += 1;
      setDisplayed(decisions.slice(0, Math.min(step, initialCount)));
      if (step >= initialCount) {
        clearInterval(timer);
        setStarted(true);
      }
    }, 400);
    return () => clearInterval(timer);
  }, [decisions]);

  useEffect(() => {
    if (!started || decisions.length <= 3) return;
    const cycle = setInterval(() => {
      setDisplayed((current) => {
        const next = [...current];
        next.shift();
        const lastId = current[current.length - 1]?.recordId;
        const lastIndex = decisions.findIndex((d) => d.recordId === lastId);
        const nextIndex = (lastIndex + 1) % decisions.length;
        next.push(decisions[nextIndex]);
        return next;
      });
    }, 3000);
    return () => clearInterval(cycle);
  }, [started, decisions]);

  if (decisions.length === 0) {
    return <p className="text-sm text-white/40">No decisions recorded yet.</p>;
  }

  return (
    <div className="space-y-4">
      <AnimatePresence initial={false} mode="popLayout">
        {displayed.map((d) => (
          <motion.div
            key={d.recordId}
            layout="position"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="border-b border-white/10 pb-3 last:border-0"
          >
            <p className="text-sm font-medium text-white/90">{d.note || d.decision || 'Decision recorded'}</p>
            <p className="mt-1 text-xs text-white/50">
              {new Date(d.sealedAt).toLocaleDateString()} · {new Date(d.sealedAt).toLocaleTimeString()}
            </p>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ---------- Receipts / Log (unchanged) ----------
function ReceiptsLog() {
  const items = [
    { label: 'Receipts → 9 matched to card charges', detail: 'Report → drafted · $2,340 across 3 trips' },
    { label: 'Flagged → 1 charge · harbor hotel, $412 twice', detail: 'the harbor hotel charged $412 on the 12th and again on the 14th. double-billed, or two separate nights?' },
  ];
  const chatSnippet = 'two nights, mia stayed the second one';

  return (
    <div className="space-y-4">
      {items.map((item, idx) => (
        <div key={idx} className="border-b border-white/10 pb-3 last:border-0">
          <p className="text-sm font-medium text-white/80">{item.label}</p>
          <p className="mt-1 text-xs text-white/50">{item.detail}</p>
        </div>
      ))}
      <div className="mt-4 rounded-md bg-white/5 p-3 text-sm text-white/60">
        <span className="text-white/40">→</span> {chatSnippet}
      </div>
    </div>
  );
}

// ---------- Main HomeClient ----------

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

  return (
    <main className="home-research min-h-screen bg-[#080809] pt-16 text-foreground antialiased selection:bg-foreground/10">
      <SiteHeader />

      {/* Hero – big title, subtitle, two CTAs (our wording, screenshot design) */}
      <section className="hero-research hero-particle-section relative overflow-hidden">
        <div className="hero-particle-stage absolute inset-0 w-full h-full overflow-hidden pointer-events-none" aria-hidden="true">
          <HermesLiquidityFieldRender maxParticles={30000} />
          <div className="hero-particle-vignette absolute inset-0 pointer-events-none" />
        </div>

        <motion.div
          initial={heroInitial}
          animate="show"
          variants={stagger}
          className="hero-particle-layout relative z-10 mx-auto max-w-6xl px-5 pt-14 pb-16 md:pt-20 md:pb-20"
        >
          <div className="hero-particle-copy home-hero-copy max-w-3xl mx-auto text-center">
            <motion.p variants={fade} className="hero-particle-eyebrow text-center">
              Solace
            </motion.p>
            <motion.h1 variants={fade} className="hero-particle-title home-hero-title is-mission text-center">
              Machines that make decisions for you.
            </motion.h1>
            <motion.p variants={fade} className="home-hero-subline text-lg font-medium text-foreground/90 text-center">
              Hermes is the first one. It manages money and makes market decisions on your behalf.
            </motion.p>
            <motion.p variants={fade} className="home-hero-dek text-muted mt-3 text-center">
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

        {/* Record band – kept from original */}
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

      {/* Oracle Q&A + Hermes Decision Feed (no code viewer) */}
      <section className="px-5 py-12 md:py-16">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {/* Oracle Q&A */}
            <div className="rounded-2xl border border-white/10 bg-[#121214] p-6 shadow-2xl">
              <h3 className="mb-4 font-mono text-xs font-medium uppercase tracking-widest text-white/40">
                Oracle – Latest Predictions
              </h3>
              <OracleQnaFeed predictions={oraclePredictions} />
              <div className="mt-4 flex justify-end">
                <Link
                  href="/oracle"
                  className="flex items-center gap-1 text-xs text-white/40 transition-colors hover:text-white"
                >
                  Explore → <span className="text-sm">→</span>
                </Link>
              </div>
            </div>

            {/* Hermes Decision Feed (plain) */}
            <div className="rounded-2xl border border-white/10 bg-[#121214] p-6 shadow-2xl">
              <h3 className="mb-4 font-mono text-xs font-medium uppercase tracking-widest text-white/40">
                Hermes – Recent Decisions
              </h3>
              <HermesDecisionFeed decisions={recentDecisions} />
              <div className="mt-4 flex justify-end">
                <Link
                  href={OBSERVATORY_HERMES_LEDGER_PATH}
                  className="flex items-center gap-1 text-xs text-white/40 transition-colors hover:text-white"
                >
                  Explore → <span className="text-sm">→</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Receipts & Chat row */}
      <section className="border-t border-white/10 px-5 py-12 md:py-16">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-[#121214] p-6 shadow-2xl">
              <h3 className="mb-4 font-mono text-xs font-medium uppercase tracking-widest text-white/40">
                Receipts & Log
              </h3>
              <ReceiptsLog />
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#121214] p-6 shadow-2xl">
              <h3 className="mb-4 font-mono text-xs font-medium uppercase tracking-widest text-white/40">
                Chat
              </h3>
              <div className="flex h-32 items-center justify-center rounded border border-dashed border-white/10 text-sm text-white/30">
                <span>💬 Ask me anything</span>
              </div>
              <div className="mt-4 flex justify-end">
                <Link
                  href="/chat"
                  className="flex items-center gap-1 text-xs text-white/40 transition-colors hover:text-white"
                >
                  Start a conversation →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <section className="border-t border-white/10 px-5 py-16 md:py-20">
        <div className="mx-auto max-w-6xl">
          <p className="max-w-xl text-sm leading-relaxed text-muted">
            Solace is built by <span className="text-foreground">Kerby Jean</span>.
          </p>
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <Link href="/brief" className="text-muted underline decoration-transparent underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground/30">
              Read the brief
            </Link>
            <Link href="/research" className="text-muted underline decoration-transparent underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground/30">
              Notes
            </Link>
            <a href="https://github.com/Jkurbs" target="_blank" rel="noopener noreferrer" className="text-muted underline decoration-transparent underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground/30">
              GitHub
            </a>
            <a href="mailto:hello@solace.fyi" className="text-muted underline decoration-transparent underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground/30">
              hello@solace.fyi
            </a>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}