'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

import SiteFooter from '@/components/site-footer';
import SiteHeader from '@/components/site-header';
import type { HermesPublicPosture } from '@/features/hermes-public-reading/types';
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

export type ResearchItem = {
  kind: 'News' | 'Research' | 'Brief';
  title: string;
  dek: string;
  label: string;
  href: string;
  date: string;
};

export type HermesTelemetry = {
  posture: HermesPublicPosture;
  reason?: string;
  condition?: string;
  deployedCount?: number;
  pathsCount: number;
  pathsLabel: string;
  updatedAt: string;
};

export type HomeInstrumentSnapshot = {
  hermes: {
    posture: string | null;
    pathsCount: number | null;
    sealedDecisions: number | null;
    standDownRate: string | null;
    openPaths: number | null;
    openPnl: number | null;
  };
  oracleActiveCount: number | null;
  glorya: {
    evaluated: number;
    standingDown: number;
    standDownRate: number;
  };
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

export default function HomeClient({
  hermesTelemetry,
  instruments,
  researchItems,
  chainHead = null,
  anchor = null,
}: {
  hermesTelemetry: HermesTelemetry | null;
  instruments: HomeInstrumentSnapshot;
  researchItems: ResearchItem[];
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
      const anchor = target.closest('a[href]');
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (!isInAppNavigationAnchor(anchor)) return;
      setWebglPaused(true);
    };
    const onShow = () => setWebglPaused(false);
    const onVis = () => { if (document.visibilityState === 'visible') setWebglPaused(false); };
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

  return (
    <main className="home-research min-h-screen bg-background pt-16 text-foreground antialiased selection:bg-foreground/10">
      <SiteHeader />

      {/* ── STAGE 1: HERO SECTION ── */}
      <section className="hero-research hero-particle-section relative overflow-hidden">
        <div className="hero-particle-stage absolute inset-0 w-full h-full overflow-hidden pointer-events-none" aria-hidden="true">
          <HermesLiquidityFieldRender maxParticles={30000} />
          <div className="hero-particle-vignette absolute inset-0 pointer-events-none" />
        </div>

        <motion.div
          initial={heroInitial}
          animate="show"
          variants={stagger}
          className="hero-particle-layout relative z-10 mx-auto max-w-5xl px-5 pt-16 pb-20 md:pt-24 md:pb-28"
        >
          <div className="hero-particle-copy max-w-3xl">
            <motion.p variants={fade} className="hero-particle-eyebrow text-xs uppercase tracking-[0.2em] text-muted mb-4 font-mono">
              Decision Engine for High Uncertainty
            </motion.p>

            <motion.h1
              variants={fade}
              className="text-4xl sm:text-6xl md:text-7xl font-serif font-medium leading-[1.08] tracking-tight text-foreground"
            >
              Software built to make calm choices when the future is unpredictable.
            </motion.h1>

            <motion.p
              variants={fade}
              className="mt-6 text-lg sm:text-xl text-muted leading-relaxed font-sans max-w-2xl"
            >
              Solace builds autonomous decision tools for capital, truth, and relief—logged publicly before the outcome is known so you never have to take our word for it.
            </motion.p>

            <motion.div variants={fade} className="mt-8 flex flex-wrap gap-4 font-mono text-xs font-semibold">
              <Link href="/hermes" className="hero-cta hero-cta-primary hero-cta-on-void">
                Watch Hermes Live
              </Link>
              <Link href={OBSERVATORY_HERMES_LEDGER_PATH} className="hero-cta hero-cta-secondary">
                Open Observatory
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* ── STAGE 2: TRI-DOMAIN TELEMETRY HUD ── */}
      <section className="px-5 py-12 border-t border-border/50 bg-foreground/[0.01]">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4 mb-6">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <p className="text-xs font-mono uppercase tracking-[0.15em] font-semibold text-foreground">
                  LIVE SYSTEM TELEMETRY
                </p>
              </div>
              <span className="text-xs font-mono text-muted">
                Updated: {hermesTelemetry?.updatedAt ?? 'Real-time'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 font-mono">
              {/* Domain 1: Capital */}
              <div className="space-y-1 p-3 rounded-lg bg-background/50 border border-border/40">
                <p className="text-[0.7rem] uppercase tracking-wider text-emerald-500 dark:text-emerald-400 font-bold">01 // CAPITAL (HERMES)</p>
                <p className="text-sm font-bold text-foreground">
                  Posture: [{hermesTelemetry?.posture ?? 'DEFENSIVE'}]
                </p>
                <p className="text-[0.75rem] text-muted truncate">
                  {hermesTelemetry?.condition ?? 'Risk Allocation Engine'}
                </p>
              </div>

              {/* Domain 2: Truth */}
              <div className="space-y-1 p-3 rounded-lg bg-background/50 border border-border/40">
                <p className="text-[0.7rem] uppercase tracking-wider text-cyan-500 dark:text-cyan-400 font-bold">02 // TRUTH (ORACLE)</p>
                <p className="text-sm font-bold text-foreground">
                  Status: Active
                </p>
                <p className="text-[0.75rem] text-muted truncate">
                  Prediction Accuracy Ledger
                </p>
              </div>

              {/* Domain 3: Relief */}
              <div className="space-y-1 p-3 rounded-lg bg-background/50 border border-border/40">
                <p className="text-[0.7rem] uppercase tracking-wider text-amber-500 font-bold">03 // RELIEF (GLORYA)</p>
                <p className="text-sm font-bold text-foreground">
                  Status: Evaluating
                </p>
                <p className="text-[0.75rem] text-muted truncate">
                  Humanitarian Aid Routing
                </p>
              </div>
            </div>

            {chainHead && (
              <div className="mt-6 pt-4 border-t border-border/60 flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-muted">
                <span className="truncate max-w-md">
                  Pre-Commit Hash: <span className="text-foreground">{chainHead.hash}</span>
                </span>
                <span className="text-emerald-500 dark:text-emerald-400 flex items-center gap-1 font-sans font-medium">
                  ✓ Immutable Ledger Anchored
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── STAGE 3: THE 3 INSTRUMENTS ── */}
      <section className="px-5 py-16 md:py-24 border-t border-border">
        <div className="mx-auto max-w-5xl">
          <div className="text-center md:text-left mb-12">
            <h2 className="text-xs uppercase tracking-[0.2em] text-muted mb-2 font-mono">Three Instruments</h2>
            <p className="font-serif text-2xl md:text-3xl font-medium">Broad decision theory applied to human impact.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* HERMES */}
            <div className="rounded-xl border border-border bg-card p-6 flex flex-col justify-between hover:border-emerald-500/40 transition-colors">
              <div>
                <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
                  <h3 className="font-mono text-lg font-bold tracking-tight">HERMES</h3>
                  <span className="text-xs font-mono text-muted">Domain: Capital</span>
                </div>
                <p className="text-sm text-muted leading-relaxed">
                  Software that allocates and protects money automatically when markets go chaotic.
                </p>
              </div>
              <div className="mt-8 pt-4 border-t border-border flex items-center justify-between">
                <span className="text-xs font-mono text-emerald-500 dark:text-emerald-400 font-medium">● Status: Live</span>
                <Link href="/hermes" className="text-xs font-medium underline underline-offset-4 hover:text-muted">
                  Inspect →
                </Link>
              </div>
            </div>

            {/* ORACLE */}
            <div className="rounded-xl border border-border bg-card p-6 flex flex-col justify-between hover:border-cyan-500/40 transition-colors">
              <div>
                <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
                  <h3 className="font-mono text-lg font-bold tracking-tight">ORACLE</h3>
                  <span className="text-xs font-mono text-muted">Domain: Truth</span>
                </div>
                <p className="text-sm text-muted leading-relaxed">
                  A real-time meter that tracks predictions against real events to measure who is actually right.
                </p>
              </div>
              <div className="mt-8 pt-4 border-t border-border flex items-center justify-between">
                <span className="text-xs font-mono text-emerald-500 dark:text-emerald-400 font-medium">● Status: Live</span>
                <Link href="/oracle" className="text-xs font-medium underline underline-offset-4 hover:text-muted">
                  Inspect →
                </Link>
              </div>
            </div>

            {/* GLORYA */}
            <div className="rounded-xl border border-border bg-card p-6 flex flex-col justify-between hover:border-amber-500/40 transition-colors">
              <div>
                <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
                  <h3 className="font-mono text-lg font-bold tracking-tight">GLORYA</h3>
                  <span className="text-xs font-mono text-muted">Domain: Relief</span>
                </div>
                <p className="text-sm text-muted leading-relaxed">
                  Software that routes humanitarian aid only when intervention will actually change the outcome.
                </p>
              </div>
              <div className="mt-8 pt-4 border-t border-border flex items-center justify-between">
                <span className="text-xs font-mono text-amber-500 font-medium">○ Status: Evaluating</span>
                <Link href="/glorya" className="text-xs font-medium underline underline-offset-4 hover:text-muted">
                  Inspect →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STAGE 4: UN-FAKABLE PROOF ── */}
      <section className="px-5 py-16 md:py-24 border-t border-border bg-card/30">
        <div className="mx-auto max-w-3xl text-center md:text-left">
          <p className="text-xs uppercase tracking-[0.2em] text-muted mb-3 font-mono">Verification</p>
          <h2 className="font-serif text-3xl md:text-4xl font-medium tracking-tight mb-6">
            Un-fakable Proof
          </h2>
          <p className="text-lg text-foreground font-medium mb-4">
            Most platforms change their story after they see what happens.
          </p>
          <p className="text-muted leading-relaxed text-base md:text-lg mb-8">
            Solace locks every decision into an un-editable public ledger BEFORE any action is taken. We cannot delete our mistakes, alter our history, or fake our results.
          </p>
          <div>
            <Link
              href={OBSERVATORY_HERMES_LEDGER_PATH}
              className="hero-cta hero-cta-primary inline-flex items-center gap-2 font-mono text-xs font-semibold"
            >
              Verify Full History in 1-Click
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── STAGE 5: THE OPERATOR SECTION ── */}
      <section className="px-5 py-16 md:py-24 border-t border-border">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs uppercase tracking-[0.2em] text-muted mb-3 font-mono">Operator</p>
          <h2 className="font-serif text-3xl md:text-4xl font-medium tracking-tight mb-6">
            One Operator. Zero Excuses.
          </h2>
          <div className="space-y-4 text-muted text-base md:text-lg leading-relaxed">
            <p>
              Systems built by large teams become too complex to audit. Solace is engineered and operated by <strong className="text-foreground font-semibold">Kerby Jean</strong> (ex-Apple Systems Engineer).
            </p>
            <p>
              Building software at Apple requires zero-failure discipline. Solace is built on that same standard: simple enough for one engineer to run, and transparent enough for anyone to verify.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium">
            <Link
              href="/brief"
              className="underline underline-offset-4 decoration-foreground/20 hover:decoration-foreground"
            >
              Read the Brief
            </Link>
            <a
              href="https://github.com/Jkurbs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted hover:text-foreground underline underline-offset-4 decoration-transparent hover:decoration-foreground"
            >
              GitHub
            </a>
            <a
              href="mailto:hello@solace.fyi"
              className="text-muted hover:text-foreground underline underline-offset-4 decoration-transparent hover:decoration-foreground"
            >
              hello@solace.fyi
            </a>
          </div>
        </div>
      </section>

      {/* ── STAGE 6: RESEARCH & BRIEF SHELF ── */}
      <section className="border-t border-border px-5 py-16 md:py-24">
        <div className="mx-auto max-w-3xl">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted mb-2 font-mono">Documentation</p>
              <h2 className="font-serif text-2xl md:text-3xl font-medium">Research & The Brief</h2>
            </div>
            <Link
              href="/brief"
              className="text-sm text-muted hover:text-foreground underline underline-offset-4"
            >
              Read Full Brief →
            </Link>
          </div>

          <div className="divide-y divide-border border-t border-border">
            {researchItems.slice(0, 2).map((item) => (
              <Link
                key={`${item.kind}-${item.href}-${item.title}`}
                href={item.href}
                className="group block py-6"
              >
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-xs uppercase font-mono tracking-wider text-muted">{item.kind}</span>
                  <span className="text-xs font-mono text-muted">{item.label}</span>
                </div>
                <h3 className="mt-2 font-serif text-xl font-medium group-hover:opacity-75 transition-opacity">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm text-muted leading-relaxed">{item.dek}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}