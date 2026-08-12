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
    <main className="home-research min-h-screen bg-background pt-16 text-foreground antialiased selection:bg-foreground/10">
      <SiteHeader />

      {/* ── HERO SECTION ── */}
      <section className="hero-research hero-particle-section relative overflow-hidden">
        <div className="hero-particle-stage absolute inset-0 w-full h-full overflow-hidden pointer-events-none" aria-hidden="true">
          <HermesLiquidityFieldRender maxParticles={30000} />
          <div className="hero-particle-vignette absolute inset-0 bg-gradient-to-b from-background/40 via-transparent to-background pointer-events-none" />
        </div>

        <motion.div
          initial={heroInitial}
          animate="show"
          variants={stagger}
          className="hero-particle-layout relative z-10 mx-auto max-w-5xl px-6 pt-20 pb-24 md:pt-32 md:pb-36"
        >
          <div className="hero-particle-copy max-w-3xl">
            <motion.div variants={fade} className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/60 backdrop-blur-md px-3 py-1 mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-foreground/60" />
              <span className="text-[0.7rem] uppercase tracking-[0.2em] font-mono text-muted">
                Decision Systems for High Uncertainty
              </span>
            </motion.div>

            <motion.h1
              variants={fade}
              className="text-4xl sm:text-6xl md:text-7xl font-serif font-medium leading-[1.08] tracking-tight text-foreground"
            >
              Software built to make calm choices when the future is unpredictable.
            </motion.h1>

            <motion.p
              variants={fade}
              className="mt-6 text-lg sm:text-xl text-muted leading-relaxed font-sans max-w-2xl font-normal"
            >
              Solace builds autonomous decision tools for capital, truth, and relief—logged publicly before the outcome is known so you never have to take our word for it.
            </motion.p>

            <motion.div variants={fade} className="mt-10 flex flex-wrap items-center gap-4">
              <Link href="/hermes" className="hero-cta hero-cta-primary hero-cta-on-void group inline-flex items-center gap-2">
                Watch Hermes Live
                <span className="transition-transform group-hover:translate-x-0.5" aria-hidden="true">→</span>
              </Link>
              <Link href={OBSERVATORY_HERMES_LEDGER_PATH} className="hero-cta hero-cta-secondary">
                Open Observatory
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* ── LIVE TELEMETRY CARD ── */}
      <section className="px-6 py-12 border-t border-border/60 bg-muted/10">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl border border-border/80 bg-card/80 backdrop-blur-md p-6 md:p-8 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-4 mb-6">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <p className="text-xs font-mono uppercase tracking-[0.18em] font-semibold text-foreground">
                  HERMES TELEMETRY (LIVE)
                </p>
              </div>
              <span className="text-xs font-mono text-muted">
                Updated: {hermesTelemetry?.updatedAt ?? 'Real-time'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 font-mono">
              <div className="space-y-1.5 p-3 rounded-lg bg-background/50 border border-border/40">
                <p className="text-[0.68rem] uppercase tracking-wider text-muted">Current Posture</p>
                <p className="text-base font-bold text-emerald-500 dark:text-emerald-400">
                  [{hermesTelemetry?.posture ?? 'DEFENSIVE'}]
                </p>
              </div>
              <div className="space-y-1.5 p-3 rounded-lg bg-background/50 border border-border/40">
                <p className="text-[0.68rem] uppercase tracking-wider text-muted">Active Market State</p>
                <p className="text-sm text-foreground font-medium truncate">
                  {hermesTelemetry?.condition ?? 'High Volatility Expansion'}
                </p>
              </div>
              <div className="space-y-1.5 p-3 rounded-lg bg-background/50 border border-border/40">
                <p className="text-[0.68rem] uppercase tracking-wider text-muted">Active Execution Rule</p>
                <p className="text-sm text-muted truncate">
                  {hermesTelemetry?.reason ?? 'Waiting for liquidity delta > 2.5x'}
                </p>
              </div>
            </div>

            {chainHead && (
              <div className="mt-6 pt-4 border-t border-border/40 flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-muted">
                <span className="truncate max-w-md">
                  Live Decision Hash: <span className="text-foreground font-medium">{chainHead.hash}</span>
                </span>
                <span className="text-emerald-500 dark:text-emerald-400 flex items-center gap-1.5 font-sans font-medium">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Timestamp Verified
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── THE 3 INSTRUMENTS ── */}
      <section className="px-6 py-16 md:py-24 border-t border-border/60">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12">
            <p className="text-xs font-mono uppercase tracking-[0.2em] text-muted mb-2">Three Instruments</p>
            <h2 className="font-serif text-3xl md:text-4xl font-medium tracking-tight">
              Broad decision theory applied to human impact.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* HERMES */}
            <div className="group rounded-2xl border border-border/80 bg-card p-6 flex flex-col justify-between hover:border-foreground/20 transition-all duration-200">
              <div>
                <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-4">
                  <h3 className="font-mono text-lg font-bold tracking-tight">HERMES</h3>
                  <span className="text-[0.7rem] font-mono uppercase tracking-wider text-muted">Domain: Capital</span>
                </div>
                <p className="text-sm text-muted leading-relaxed">
                  Software that allocates and protects money automatically when markets go chaotic.
                </p>
              </div>
              <div className="mt-8 pt-4 border-t border-border/60 flex items-center justify-between">
                <span className="text-xs font-mono text-emerald-500 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Live
                </span>
                <Link href="/hermes" className="text-xs font-medium text-foreground hover:text-muted transition-colors inline-flex items-center gap-1">
                  Inspect <span className="transition-transform group-hover:translate-x-0.5">→</span>
                </Link>
              </div>
            </div>

            {/* ORACLE */}
            <div className="group rounded-2xl border border-border/80 bg-card p-6 flex flex-col justify-between hover:border-foreground/20 transition-all duration-200">
              <div>
                <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-4">
                  <h3 className="font-mono text-lg font-bold tracking-tight">ORACLE</h3>
                  <span className="text-[0.7rem] font-mono uppercase tracking-wider text-muted">Domain: Truth</span>
                </div>
                <p className="text-sm text-muted leading-relaxed">
                  A real-time meter that tracks predictions against real events to measure who is actually right.
                </p>
              </div>
              <div className="mt-8 pt-4 border-t border-border/60 flex items-center justify-between">
                <span className="text-xs font-mono text-emerald-500 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Live
                </span>
                <Link href="/oracle" className="text-xs font-medium text-foreground hover:text-muted transition-colors inline-flex items-center gap-1">
                  Inspect <span className="transition-transform group-hover:translate-x-0.5">→</span>
                </Link>
              </div>
            </div>

            {/* GLORYA */}
            <div className="group rounded-2xl border border-border/80 bg-card p-6 flex flex-col justify-between hover:border-foreground/20 transition-all duration-200">
              <div>
                <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-4">
                  <h3 className="font-mono text-lg font-bold tracking-tight">GLORYA</h3>
                  <span className="text-[0.7rem] font-mono uppercase tracking-wider text-muted">Domain: Relief</span>
                </div>
                <p className="text-sm text-muted leading-relaxed">
                  Software that routes humanitarian aid only when intervention will actually change the outcome.
                </p>
              </div>
              <div className="mt-8 pt-4 border-t border-border/60 flex items-center justify-between">
                <span className="text-xs font-mono text-amber-500 dark:text-amber-400 font-medium flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  Evaluating
                </span>
                <Link href="/glorya" className="text-xs font-medium text-foreground hover:text-muted transition-colors inline-flex items-center gap-1">
                  Inspect <span className="transition-transform group-hover:translate-x-0.5">→</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── UN-FAKABLE PROOF ── */}
      <section className="px-6 py-20 md:py-28 border-t border-border/60 bg-muted/20">
        <div className="mx-auto max-w-3xl text-center md:text-left">
          <p className="text-xs font-mono uppercase tracking-[0.2em] text-muted mb-3">Verification</p>
          <h2 className="font-serif text-3xl md:text-5xl font-medium tracking-tight mb-6">
            Un-fakable Proof
          </h2>
          <p className="text-lg md:text-xl text-foreground font-medium mb-4">
            Most platforms change their story after they see what happens.
          </p>
          <p className="text-muted leading-relaxed text-base md:text-lg mb-8 max-w-2xl">
            Solace locks every decision into an un-editable public ledger BEFORE any action is taken. We cannot delete our mistakes, alter our history, or fake our results.
          </p>
          <div>
            <Link
              href={OBSERVATORY_HERMES_LEDGER_PATH}
              className="hero-cta hero-cta-primary inline-flex items-center gap-2 group"
            >
              Verify Full History in 1-Click
              <span className="transition-transform group-hover:translate-x-1" aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── THE OPERATOR SECTION ── */}
      <section className="px-6 py-20 md:py-28 border-t border-border/60">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-mono uppercase tracking-[0.2em] text-muted mb-3">Operator</p>
          <h2 className="font-serif text-3xl md:text-5xl font-medium tracking-tight mb-6">
            One Operator. Zero Excuses.
          </h2>
          <div className="space-y-5 text-muted text-base md:text-lg leading-relaxed font-sans">
            <p>
              Systems built by large teams often become too complex to audit. Solace is engineered and operated by <strong className="text-foreground font-medium">Kerby Jean</strong> (ex-Apple Systems Engineer).
            </p>
            <p>
              Building software at Apple demands zero-failure discipline. Solace is built on that same standard: simple enough for one engineer to run, and transparent enough for anyone to verify.
            </p>
          </div>

          <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm font-medium border-t border-border/40 pt-6">
            <Link
              href="/brief"
              className="text-foreground underline underline-offset-4 decoration-border hover:decoration-foreground transition-colors"
            >
              Read the Brief
            </Link>
            <a
              href="https://github.com/Jkurbs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted hover:text-foreground underline underline-offset-4 decoration-transparent hover:decoration-foreground transition-colors"
            >
              GitHub
            </a>
            <a
              href="mailto:hello@solace.fyi"
              className="text-muted hover:text-foreground underline underline-offset-4 decoration-transparent hover:decoration-foreground transition-colors"
            >
              hello@solace.fyi
            </a>
          </div>
        </div>
      </section>

      {/* ── RESEARCH & BRIEF SHELF ── */}
      <section className="border-t border-border/60 px-6 py-20 md:py-28 bg-card/40">
        <div className="mx-auto max-w-3xl">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
            <div>
              <p className="text-xs font-mono uppercase tracking-[0.2em] text-muted mb-2">Documentation</p>
              <h2 className="font-serif text-3xl font-medium">Research & The Brief</h2>
            </div>
            <Link
              href="/brief"
              className="text-sm font-medium text-muted hover:text-foreground underline underline-offset-4 transition-colors"
            >
              Read Full Brief →
            </Link>
          </div>

          <div className="divide-y divide-border/60 border-t border-b border-border/60">
            {researchItems.slice(0, 2).map((item) => (
              <Link
                key={`${item.kind}-${item.href}-${item.title}`}
                href={item.href}
                className="group block py-8 transition-colors hover:bg-muted/10 -mx-4 px-4 rounded-xl"
              >
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-[0.7rem] uppercase font-mono tracking-wider text-muted">{item.kind}</span>
                  <span className="text-xs font-mono text-muted">{item.label}</span>
                </div>
                <h3 className="mt-2 font-serif text-xl md:text-2xl font-medium group-hover:text-muted transition-colors">
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