'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

import SiteFooter from '@/components/site-footer';
import SiteHeader from '@/components/site-header';
import type { HermesPublicPosture } from '@/features/hermes-public-reading/types';
import { OBSERVATORY_HERMES_LEDGER_PATH } from '@/features/observatory/paths';
import { isInAppNavigationAnchor, setWebglPaused } from '@/lib/webgl-lifecycle';

import HermesLiquidityFieldRender from './HermesLiquidityFieldRender';

const easeOut = [0.16, 1, 0.3, 1] as [number, number, number, number];

const fade = {
  hidden: { opacity: 0, y: 16 },
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
    <main className="home-research min-h-screen bg-background pt-16 text-foreground antialiased selection:bg-foreground/20">
      <SiteHeader />

      {/* ── HERO SECTION ── */}
      <section className="hero-research hero-particle-section relative overflow-hidden border-b border-border/40">
        <div className="hero-particle-stage absolute inset-0 w-full h-full overflow-hidden pointer-events-none" aria-hidden="true">
          <HermesLiquidityFieldRender maxParticles={30000} />
          <div className="hero-particle-vignette absolute inset-0 bg-gradient-to-b from-background/30 via-background/60 to-background pointer-events-none" />
        </div>

        <motion.div
          initial={heroInitial}
          animate="show"
          variants={stagger}
          className="hero-particle-layout relative z-10 mx-auto max-w-5xl px-6 pt-20 pb-24 md:pt-32 md:pb-36"
        >
          <div className="hero-particle-copy max-w-3xl">
            <motion.div variants={fade} className="inline-flex items-center gap-2 rounded-md border border-foreground/10 bg-foreground/[0.03] px-3 py-1 mb-6 backdrop-blur-md">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[0.68rem] uppercase tracking-[0.25em] font-mono text-muted-foreground font-semibold">
                Decision Systems for High Uncertainty
              </span>
            </motion.div>

            <motion.h1
              variants={fade}
              className="text-4xl sm:text-6xl md:text-7xl font-serif font-medium leading-[1.05] tracking-tight text-foreground"
            >
              Software built to make calm choices when the future is unpredictable.
            </motion.h1>

            <motion.p
              variants={fade}
              className="mt-6 text-lg sm:text-xl text-muted-foreground leading-relaxed font-sans max-w-2xl font-normal"
            >
              Solace builds autonomous decision tools for capital, truth, and relief—logged publicly before the outcome is known so you never have to take our word for it.
            </motion.p>

            <motion.div variants={fade} className="mt-10 flex flex-wrap items-center gap-4">
              <Link href="/hermes" className="hero-cta hero-cta-primary hero-cta-on-void group inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider px-6 py-3.5 rounded-lg bg-foreground text-background font-semibold hover:bg-foreground/90 transition-all">
                Watch Hermes Live
                <span className="transition-transform group-hover:translate-x-1" aria-hidden="true">→</span>
              </Link>
              <Link href={OBSERVATORY_HERMES_LEDGER_PATH} className="hero-cta hero-cta-secondary font-mono text-xs uppercase tracking-wider px-6 py-3.5 rounded-lg border border-border hover:bg-foreground/[0.05] transition-all">
                Open Observatory
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* ── LIVE TELEMETRY TERMINAL HUD ── */}
      <section className="px-6 py-10 bg-background/50 border-b border-border/40">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-xl border border-border/80 bg-black/80 backdrop-blur-xl p-6 shadow-2xl relative overflow-hidden">
            {/* Terminal Top Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4 mb-6 font-mono text-xs">
              <div className="flex items-center gap-3">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="font-bold tracking-widest text-foreground text-[0.72rem]">
                  SYS_HERMES // LIVE TELEMETRY
                </span>
              </div>
              <div className="flex items-center gap-4 text-[0.68rem] text-muted-foreground">
                <span>UPDATED: {hermesTelemetry?.updatedAt ?? 'REAL-TIME'}</span>
                <span className="hidden sm:inline border-l border-white/10 pl-4 font-mono text-emerald-400">ENGINE_ONLINE</span>
              </div>
            </div>

            {/* Metrics HUD Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
              <div className="p-4 rounded-lg bg-white/[0.02] border border-white/5 space-y-1">
                <span className="text-[0.65rem] uppercase tracking-widest text-muted-foreground block">Current Posture</span>
                <span className="text-base font-bold text-emerald-400 block tracking-wide">
                  [{hermesTelemetry?.posture ?? 'DEFENSIVE'}]
                </span>
              </div>
              <div className="p-4 rounded-lg bg-white/[0.02] border border-white/5 space-y-1">
                <span className="text-[0.65rem] uppercase tracking-widest text-muted-foreground block">Market Condition</span>
                <span className="text-sm font-medium text-foreground block truncate">
                  {hermesTelemetry?.condition ?? 'High Volatility Expansion'}
                </span>
              </div>
              <div className="p-4 rounded-lg bg-white/[0.02] border border-white/5 space-y-1">
                <span className="text-[0.65rem] uppercase tracking-widest text-muted-foreground block">Execution Parameter</span>
                <span className="text-sm text-muted-foreground block truncate">
                  {hermesTelemetry?.reason ?? 'Waiting for liquidity delta > 2.5x'}
                </span>
              </div>
            </div>

            {/* Proof Hash Strip */}
            {chainHead && (
              <div className="mt-5 pt-4 border-t border-white/5 flex flex-wrap items-center justify-between gap-3 text-[0.7rem] font-mono text-muted-foreground">
                <div className="flex items-center gap-2 truncate max-w-lg">
                  <span className="text-foreground font-semibold">PRE-COMMIT HASH:</span>
                  <span className="truncate text-muted-foreground/80 bg-white/[0.04] px-2 py-0.5 rounded font-mono text-[0.65rem] border border-white/5">
                    {chainHead.hash}
                  </span>
                </div>
                <span className="text-emerald-400 flex items-center gap-1.5 font-sans text-[0.75rem] font-medium ml-auto">
                  ✓ Timestamp Immutable
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── THE 3 INSTRUMENTS ── */}
      <section className="px-6 py-20 md:py-28 border-b border-border/40">
        <div className="mx-auto max-w-5xl">
          <div className="mb-14">
            <p className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground mb-2">Three Instruments</p>
            <h2 className="font-serif text-3xl md:text-5xl font-medium tracking-tight">
              Broad decision theory applied to human impact.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* HERMES */}
            <div className="group rounded-2xl border border-border/80 bg-card p-7 flex flex-col justify-between hover:border-emerald-500/40 transition-all duration-300 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
              <div>
                <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-5">
                  <h3 className="font-mono text-xl font-bold tracking-tight">HERMES</h3>
                  <span className="text-[0.65rem] font-mono uppercase tracking-widest text-emerald-500 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Capital</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Software that allocates and protects money automatically when markets go chaotic.
                </p>
              </div>
              <div className="mt-10 pt-4 border-t border-border/60 flex items-center justify-between">
                <span className="text-xs font-mono text-emerald-400 font-medium flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Status: Live
                </span>
                <Link href="/hermes" className="text-xs font-mono font-semibold uppercase tracking-wider text-foreground hover:text-emerald-400 transition-colors inline-flex items-center gap-1">
                  Inspect <span className="transition-transform group-hover:translate-x-1">→</span>
                </Link>
              </div>
            </div>

            {/* ORACLE */}
            <div className="group rounded-2xl border border-border/80 bg-card p-7 flex flex-col justify-between hover:border-cyan-500/40 transition-all duration-300 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />
              <div>
                <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-5">
                  <h3 className="font-mono text-xl font-bold tracking-tight">ORACLE</h3>
                  <span className="text-[0.65rem] font-mono uppercase tracking-widest text-cyan-400 font-semibold bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">Truth</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  A real-time meter that tracks predictions against real events to measure who is actually right.
                </p>
              </div>
              <div className="mt-10 pt-4 border-t border-border/60 flex items-center justify-between">
                <span className="text-xs font-mono text-cyan-400 font-medium flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                  Status: Live
                </span>
                <Link href="/oracle" className="text-xs font-mono font-semibold uppercase tracking-wider text-foreground hover:text-cyan-400 transition-colors inline-flex items-center gap-1">
                  Inspect <span className="transition-transform group-hover:translate-x-1">→</span>
                </Link>
              </div>
            </div>

            {/* GLORYA */}
            <div className="group rounded-2xl border border-border/80 bg-card p-7 flex flex-col justify-between hover:border-amber-500/40 transition-all duration-300 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
              <div>
                <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-5">
                  <h3 className="font-mono text-xl font-bold tracking-tight">GLORYA</h3>
                  <span className="text-[0.65rem] font-mono uppercase tracking-widest text-amber-400 font-semibold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">Relief</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Software that routes humanitarian aid only when intervention will actually change the outcome.
                </p>
              </div>
              <div className="mt-10 pt-4 border-t border-border/60 flex items-center justify-between">
                <span className="text-xs font-mono text-amber-400 font-medium flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  Status: Evaluating
                </span>
                <Link href="/glorya" className="text-xs font-mono font-semibold uppercase tracking-wider text-foreground hover:text-amber-400 transition-colors inline-flex items-center gap-1">
                  Inspect <span className="transition-transform group-hover:translate-x-1">→</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── UN-FAKABLE PROOF ── */}
      <section className="px-6 py-20 md:py-28 border-b border-border/40 bg-foreground/[0.015]">
        <div className="mx-auto max-w-3xl text-center md:text-left">
          <p className="text-xs font-mono uppercase tracking-[0.25em] text-muted-foreground mb-3 font-semibold">Verification Engine</p>
          <h2 className="font-serif text-4xl md:text-6xl font-medium tracking-tight mb-6">
            Un-fakable Proof
          </h2>
          <p className="text-xl text-foreground font-medium mb-4">
            Most platforms change their story after they see what happens.
          </p>
          <p className="text-muted-foreground leading-relaxed text-base md:text-lg mb-8 max-w-2xl">
            Solace locks every decision into an un-editable public ledger BEFORE any action is taken. We cannot delete our mistakes, alter our history, or fake our results.
          </p>
          <div>
            <Link
              href={OBSERVATORY_HERMES_LEDGER_PATH}
              className="inline-flex items-center gap-3 px-6 py-3.5 rounded-lg bg-foreground text-background font-mono text-xs uppercase tracking-wider font-bold hover:bg-foreground/90 transition-all group"
            >
              Verify Full History in 1-Click
              <span className="transition-transform group-hover:translate-x-1" aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── THE OPERATOR SECTION ── */}
      <section className="px-6 py-20 md:py-28 border-b border-border/40">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-mono uppercase tracking-[0.25em] text-muted-foreground mb-3 font-semibold">Operator & Standard</p>
          <h2 className="font-serif text-4xl md:text-5xl font-medium tracking-tight mb-6">
            One Operator. Zero Excuses.
          </h2>
          <div className="space-y-5 text-muted-foreground text-base md:text-lg leading-relaxed font-sans">
            <p>
              Systems built by large teams become too complex to audit. Solace is engineered and operated by <strong className="text-foreground font-semibold">Kerby Jean</strong> (ex-Apple Systems Engineer).
            </p>
            <p>
              Building software at Apple requires zero-failure discipline. Solace is built on that same standard: simple enough for one engineer to run, and transparent enough for anyone to verify.
            </p>
          </div>

          <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-xs font-mono uppercase tracking-wider border-t border-border/40 pt-6">
            <Link
              href="/brief"
              className="text-foreground font-bold underline underline-offset-4 decoration-border hover:decoration-foreground transition-colors"
            >
              Read the Brief
            </Link>
            <a
              href="https://github.com/Jkurbs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              GitHub
            </a>
            <a
              href="mailto:hello@solace.fyi"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              hello@solace.fyi
            </a>
          </div>
        </div>
      </section>

      {/* ── RESEARCH & BRIEF SHELF ── */}
      <section className="px-6 py-20 md:py-28 bg-foreground/[0.01]">
        <div className="mx-auto max-w-3xl">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
            <div>
              <p className="text-xs font-mono uppercase tracking-[0.25em] text-muted-foreground mb-2 font-semibold">Documentation</p>
              <h2 className="font-serif text-3xl font-medium">Research & The Brief</h2>
            </div>
            <Link
              href="/brief"
              className="text-xs font-mono uppercase tracking-wider font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              Read Full Brief →
            </Link>
          </div>

          <div className="divide-y divide-border/60 border-t border-b border-border/60">
            {researchItems.slice(0, 2).map((item) => (
              <Link
                key={`${item.kind}-${item.href}-${item.title}`}
                href={item.href}
                className="group block py-8 transition-colors hover:bg-foreground/[0.02] -mx-4 px-4 rounded-xl"
              >
                <div className="flex items-baseline justify-between gap-4 font-mono">
                  <span className="text-[0.68rem] uppercase tracking-wider text-muted-foreground">{item.kind}</span>
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                </div>
                <h3 className="mt-2 font-serif text-xl md:text-2xl font-medium group-hover:text-muted-foreground transition-colors">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{item.dek}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}