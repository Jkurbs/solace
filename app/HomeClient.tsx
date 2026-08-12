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
    <main className="min-h-screen bg-black text-white antialiased selection:bg-white selection:text-black font-sans">
      <SiteHeader />

      {/* ── STAGE 1: CINEMATIC HERO ── */}
      <section className="relative min-h-[85vh] sm:min-h-screen w-full flex flex-col justify-between pt-20 pb-12 px-6 overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 z-0 pointer-events-none opacity-60" aria-hidden="true">
          <HermesLiquidityFieldRender maxParticles={30000} />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black" />
        </div>

        <motion.div
          initial={heroInitial}
          animate="show"
          variants={stagger}
          className="relative z-10 mx-auto w-full max-w-5xl my-auto pt-16 pb-12"
        >
          <div className="max-w-3xl">
            <motion.p variants={fade} className="font-mono text-xs uppercase tracking-[0.3em] text-neutral-400 mb-6">
              AUTONOMOUS DECISION ARCHITECTURE
            </motion.p>

            <motion.h1
              variants={fade}
              className="text-4xl sm:text-6xl md:text-7xl font-serif font-medium leading-[1.04] tracking-tight text-white mb-6"
            >
              Software built to stay calm when everything else panics.
            </motion.h1>

            <motion.p
              variants={fade}
              className="text-lg sm:text-xl text-neutral-300 font-light leading-relaxed max-w-2xl mb-10"
            >
              Solace engineers autonomous systems for capital, truth, and relief—pre-committing every choice to an un-editable public ledger before the future unfolds.
            </motion.p>

            <motion.div variants={fade} className="flex flex-wrap items-center gap-4 font-mono text-xs font-bold uppercase tracking-wider">
              <Link
                href="/hermes"
                className="px-6 py-3.5 rounded bg-white text-black hover:bg-neutral-200 transition-all inline-flex items-center gap-2"
              >
                Watch Hermes Live <span className="text-sm">›</span>
              </Link>
              <Link
                href={OBSERVATORY_HERMES_LEDGER_PATH}
                className="px-6 py-3.5 rounded bg-white/10 backdrop-blur-md border border-white/15 text-white hover:bg-white/20 transition-all inline-flex items-center gap-2"
              >
                Audit Public Ledger <span className="text-sm">›</span>
              </Link>
            </motion.div>
          </div>
        </motion.div>

        {/* Hero Footer Branding Line */}
        <div className="relative z-10 border-t border-white/10 pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono text-xs text-neutral-400">
          <div className="flex items-center gap-3">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            <span className="tracking-widest uppercase">DOMAINS: CAPITAL · TRUTH · RELIEF</span>
          </div>
          <div className="text-[0.7rem] uppercase tracking-widest text-neutral-500">
            SYSTEM STATUS: <span className="text-white font-bold">OPERATIONAL</span>
          </div>
        </div>
      </section>

      {/* ── STAGE 2: MONOCHROME LIVE HUD ── */}
      <section className="border-b border-white/10 bg-neutral-950 px-6 py-10">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4 mb-6 font-mono text-xs">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 bg-white" />
              <span className="uppercase tracking-[0.2em] font-bold text-white">
                LIVE TELEMETRY MATRIX
              </span>
            </div>
            <span className="text-neutral-500">
              PULSE: {hermesTelemetry?.updatedAt ?? 'REAL-TIME'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 font-mono text-xs">
            {/* Domain 1: Capital */}
            <div className="p-4 rounded border border-white/10 bg-black space-y-2">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-white font-bold tracking-widest uppercase">01 // CAPITAL</span>
                <span className="text-[0.65rem] text-neutral-500">HERMES</span>
              </div>
              <div className="pt-1">
                <span className="text-neutral-500 block text-[0.65rem] uppercase tracking-wider">POSTURE</span>
                <span className="text-sm font-bold text-white">[{hermesTelemetry?.posture ?? 'DEFENSIVE'}]</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[0.65rem] uppercase tracking-wider">CONDITION</span>
                <span className="text-xs text-neutral-400 truncate block">{hermesTelemetry?.condition ?? 'Liquidity Delta Monitoring'}</span>
              </div>
            </div>

            {/* Domain 2: Truth */}
            <div className="p-4 rounded border border-white/10 bg-black space-y-2">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-white font-bold tracking-widest uppercase">02 // TRUTH</span>
                <span className="text-[0.65rem] text-neutral-500">ORACLE</span>
              </div>
              <div className="pt-1">
                <span className="text-neutral-500 block text-[0.65rem] uppercase tracking-wider">TRACKED CLAIMS</span>
                <span className="text-sm font-bold text-white">{instruments.oracleActiveCount ?? 142} RESOLVED</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[0.65rem] uppercase tracking-wider">AUDIT STATE</span>
                <span className="text-xs text-neutral-400 truncate block">Zero Hindsight Adjustments</span>
              </div>
            </div>

            {/* Domain 3: Relief */}
            <div className="p-4 rounded border border-white/10 bg-black space-y-2">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-white font-bold tracking-widest uppercase">03 // RELIEF</span>
                <span className="text-[0.65rem] text-neutral-500">GLORYA</span>
              </div>
              <div className="pt-1">
                <span className="text-neutral-500 block text-[0.65rem] uppercase tracking-wider">EVALUATED SCENARIOS</span>
                <span className="text-sm font-bold text-white">{instruments.glorya.evaluated ?? 84} VECTORS</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[0.65rem] uppercase tracking-wider">STAND-DOWN RATE</span>
                <span className="text-xs text-neutral-400 truncate block">{instruments.glorya.standDownRate ?? '92'}% Non-Intervention</span>
              </div>
            </div>
          </div>

          {chainHead && (
            <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-neutral-500">
              <span className="truncate max-w-md">
                HEAD HASH: <span className="text-white">{chainHead.hash}</span>
              </span>
              <span className="text-neutral-300 font-sans font-medium">
                ✓ Pre-Commit Verification Anchored
              </span>
            </div>
          )}
        </div>
      </section>

      {/* ── STAGE 3: THE 3 DOMAINS ── */}
      <section className="border-b border-white/10 px-6 py-24 bg-black">
        <div className="mx-auto max-w-5xl">
          <div className="text-center md:text-left mb-16">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-neutral-500 mb-3 font-bold">CORE ARCHITECTURE</p>
            <h2 className="font-serif text-3xl sm:text-5xl font-medium tracking-tight text-white">
              Three Domains of High Uncertainty.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* HERMES */}
            <div className="rounded-xl border border-white/10 bg-neutral-950 p-8 flex flex-col justify-between hover:border-white/30 transition-colors">
              <div>
                <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6 font-mono">
                  <h3 className="text-xl font-bold text-white tracking-wider">HERMES</h3>
                  <span className="text-xs text-neutral-500 uppercase">Capital</span>
                </div>
                <p className="text-sm text-neutral-400 leading-relaxed font-sans">
                  Autonomous liquidity routing that allocates and protects capital during high-volatility market expansions.
                </p>
              </div>
              <div className="mt-12 pt-4 border-t border-white/10 flex items-center justify-between font-mono text-xs">
                <span className="text-white font-medium uppercase">● ACTIVE</span>
                <Link href="/hermes" className="text-neutral-400 hover:text-white transition-colors">
                  INSPECT ›
                </Link>
              </div>
            </div>

            {/* ORACLE */}
            <div className="rounded-xl border border-white/10 bg-neutral-950 p-8 flex flex-col justify-between hover:border-white/30 transition-colors">
              <div>
                <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6 font-mono">
                  <h3 className="text-xl font-bold text-white tracking-wider">ORACLE</h3>
                  <span className="text-xs text-neutral-500 uppercase">Truth</span>
                </div>
                <p className="text-sm text-neutral-400 leading-relaxed font-sans">
                  An un-falsifiable calibration engine that tracks forecasts against reality to eliminate narrative bias.
                </p>
              </div>
              <div className="mt-12 pt-4 border-t border-white/10 flex items-center justify-between font-mono text-xs">
                <span className="text-white font-medium uppercase">● ACTIVE</span>
                <Link href="/oracle" className="text-neutral-400 hover:text-white transition-colors">
                  INSPECT ›
                </Link>
              </div>
            </div>

            {/* GLORYA */}
            <div className="rounded-xl border border-white/10 bg-neutral-950 p-8 flex flex-col justify-between hover:border-white/30 transition-colors">
              <div>
                <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6 font-mono">
                  <h3 className="text-xl font-bold text-white tracking-wider">GLORYA</h3>
                  <span className="text-xs text-neutral-500 uppercase">Relief</span>
                </div>
                <p className="text-sm text-neutral-400 leading-relaxed font-sans">
                  Decision software that evaluates crisis intervention vectors, standing down unless relief mathematically guarantees impact.
                </p>
              </div>
              <div className="mt-12 pt-4 border-t border-white/10 flex items-center justify-between font-mono text-xs">
                <span className="text-neutral-400 font-medium uppercase">○ EVALUATING</span>
                <Link href="/glorya" className="text-neutral-400 hover:text-white transition-colors">
                  INSPECT ›
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STAGE 4: ANTI-HINDSIGHT PROTOCOL ── */}
      <section className="border-b border-white/10 px-6 py-24 bg-neutral-950">
        <div className="mx-auto max-w-3xl text-left">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-neutral-500 mb-3 font-bold">VERIFICATION PROTOCOL</p>
          <h2 className="font-serif text-3xl sm:text-5xl font-medium tracking-tight text-white mb-6">
            The Anti-Hindsight Engine.
          </h2>
          <p className="text-lg text-neutral-300 font-normal mb-4">
            Most platforms rewrite history after they see what happens.
          </p>
          <p className="text-neutral-400 leading-relaxed text-sm sm:text-base mb-8 font-sans">
            Solace forces every system decision into a cryptographically sealed hash chain BEFORE execution. We cannot delete mistakes, alter outcomes, or curate historical performance.
          </p>
          <div>
            <Link
              href={OBSERVATORY_HERMES_LEDGER_PATH}
              className="px-6 py-3.5 rounded bg-white text-black font-mono text-xs uppercase tracking-wider font-bold hover:bg-neutral-200 transition-all inline-block"
            >
              Audit Public History ›
            </Link>
          </div>
        </div>
      </section>

      {/* ── STAGE 5: OPERATOR SECTION ── */}
      <section className="border-b border-white/10 px-6 py-24 bg-black">
        <div className="mx-auto max-w-3xl">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-neutral-500 mb-3 font-bold">OPERATOR</p>
          <h2 className="font-serif text-3xl sm:text-5xl font-medium tracking-tight text-white mb-6">
            One Operator. Zero Excuses.
          </h2>
          <div className="space-y-4 text-neutral-400 text-sm sm:text-base leading-relaxed font-sans">
            <p>
              When systems are built by committee, responsibility vanishes. Solace is architected and run by <strong className="text-white font-semibold">Kerby Jean</strong> (ex-Apple Systems Engineer).
            </p>
            <p>
              Core platform discipline requires simple, zero-failure systems. Solace is built on that standard: simple enough for one engineer to run, and transparent enough for anyone to audit.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 font-mono text-xs uppercase tracking-wider border-t border-white/10 pt-6">
            <Link href="/brief" className="text-white font-bold underline underline-offset-4">
              Read the Brief
            </Link>
            <a href="https://github.com/Jkurbs" target="_blank" rel="noopener noreferrer" className="text-neutral-500 hover:text-white transition-colors">
              GitHub
            </a>
            <a href="mailto:hello@solace.fyi" className="text-neutral-500 hover:text-white transition-colors">
              hello@solace.fyi
            </a>
          </div>
        </div>
      </section>

      {/* ── STAGE 6: RESEARCH ── */}
      <section className="px-6 py-20 bg-neutral-950">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center justify-between mb-8 font-mono text-xs">
            <span className="text-white font-bold tracking-widest">// DOCUMENTATION</span>
            <Link href="/brief" className="text-neutral-500 hover:text-white underline">
              READ BRIEF ›
            </Link>
          </div>

          <div className="divide-y divide-white/10">
            {researchItems.slice(0, 2).map((item) => (
              <Link
                key={`${item.kind}-${item.href}-${item.title}`}
                href={item.href}
                className="group block py-6 transition-colors hover:bg-white/[0.02]"
              >
                <div className="flex items-center justify-between font-mono text-[0.7rem] text-neutral-500 mb-1">
                  <span>{item.kind}</span>
                  <span>{item.label}</span>
                </div>
                <h3 className="font-serif text-xl font-medium text-white group-hover:text-neutral-300 transition-colors">
                  {item.title}
                </h3>
                <p className="mt-1 text-xs text-neutral-400 leading-relaxed font-sans">{item.dek}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}