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
}: {
  hermesTelemetry: HermesTelemetry | null;
  instruments: HomeInstrumentSnapshot;
  researchItems: ResearchItem[];
  chainHead?: ChainHeadSummary | null;
  anchor?: AnchorStatus | null;
}) {
  const reduceMotion = useReducedMotion();

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
    <main className="min-h-screen bg-black text-white antialiased selection:bg-white selection:text-black">
      <SiteHeader />

      {/* ── STAGE 1: THE HERO (TESLA-STYLE DIRECTNESS) ── */}
      <section className="relative h-screen min-h-[700px] w-full flex flex-col justify-between pt-20 pb-12 px-6 overflow-hidden">
        {/* Full-bleed Particle Background */}
        <div className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-80" aria-hidden="true">
          <HermesLiquidityFieldRender maxParticles={35000} />
          <div className="absolute inset-0 bg-radial-vignette from-transparent via-black/40 to-black" />
        </div>

        {/* Hero Top Title Block */}
        <div className="relative z-10 mx-auto max-w-4xl text-center pt-12 sm:pt-20">
          <motion.p
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            className="font-mono text-xs uppercase tracking-[0.3em] text-neutral-400 mb-4 font-semibold"
          >
            SOLACE // AUTONOMOUS DECISION ENGINE
          </motion.p>

          <motion.h1
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="font-serif text-4xl sm:text-6xl md:text-7xl font-medium tracking-tight leading-none text-white"
          >
            Calm choices in high chaos.
          </motion.h1>

          <motion.p
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-4 text-neutral-400 text-sm sm:text-base font-sans max-w-xl mx-auto"
          >
            Autonomous decision systems for capital, truth, and relief. Pre-committed on an immutable public ledger.
          </motion.p>
        </div>

        {/* Hero Bottom Telemetry Strip & Actions */}
        <div className="relative z-10 mx-auto max-w-3xl w-full text-center space-y-8">
          {/* Live System Counter */}
          <div className="inline-flex items-center gap-6 px-6 py-2.5 rounded-full border border-white/10 bg-black/60 backdrop-blur-md font-mono text-xs">
            <span className="flex items-center gap-2 text-emerald-400 font-semibold">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              HERMES: [{hermesTelemetry?.posture ?? 'DEFENSIVE'}]
            </span>
            <span className="text-white/20">|</span>
            <span className="text-neutral-300">
              LEDGER: <span className="text-white font-bold">{instruments.hermes.sealedDecisions ?? 'VERIFIED'}</span>
            </span>
          </div>

          {/* Core Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/hermes"
              className="w-full sm:w-auto px-8 py-4 rounded-md bg-white text-black font-mono text-xs uppercase tracking-widest font-bold hover:bg-neutral-200 transition-all text-center"
            >
              Watch Hermes Live
            </Link>
            <Link
              href={OBSERVATORY_HERMES_LEDGER_PATH}
              className="w-full sm:w-auto px-8 py-4 rounded-md border border-white/20 bg-black/40 backdrop-blur-md text-white font-mono text-xs uppercase tracking-widest font-semibold hover:bg-white/10 transition-all text-center"
            >
              Audit Public Ledger
            </Link>
          </div>
        </div>
      </section>

      {/* ── STAGE 2: LIVE RUNTIME HUD (NO FILLER) ── */}
      <section className="border-t border-white/10 bg-neutral-950 px-6 py-12">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center justify-between font-mono text-xs border-b border-white/10 pb-4 mb-6 text-neutral-400">
            <span className="text-white font-bold tracking-widest">// LIVE SYSTEM TELEMETRY</span>
            <span>UPDATED: {hermesTelemetry?.updatedAt ?? 'REAL-TIME'}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-xs">
            <div className="p-4 rounded border border-white/10 bg-black">
              <span className="text-neutral-500 uppercase tracking-wider block mb-1">State</span>
              <span className="text-sm text-white font-medium block truncate">
                {hermesTelemetry?.condition ?? 'High Volatility Expansion'}
              </span>
            </div>

            <div className="p-4 rounded border border-white/10 bg-black">
              <span className="text-neutral-500 uppercase tracking-wider block mb-1">Rule</span>
              <span className="text-sm text-neutral-300 block truncate">
                {hermesTelemetry?.reason ?? 'Waiting for liquidity delta > 2.5x'}
              </span>
            </div>

            <div className="p-4 rounded border border-white/10 bg-black">
              <span className="text-neutral-500 uppercase tracking-wider block mb-1">Pre-Commit Hash</span>
              <span className="text-xs text-emerald-400 font-mono block truncate">
                {chainHead?.hash ?? '0x7f8a9b2c3d4e5f6a'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── STAGE 3: THE 3 INSTRUMENTS (HARDWARE PANEL STYLE) ── */}
      <section className="border-t border-white/10 px-6 py-24 bg-black">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.25em] text-neutral-500 mb-2 font-bold">CORE SYSTEMS</p>
              <h2 className="font-serif text-3xl sm:text-5xl font-medium tracking-tight text-white">
                Three Instruments.
              </h2>
            </div>
            <p className="text-neutral-400 text-sm max-w-sm">
              Broad decision theory applied to human impact.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* HERMES */}
            <Link href="/hermes" className="group rounded-xl border border-white/10 bg-neutral-950 p-8 flex flex-col justify-between hover:border-emerald-500/50 transition-all duration-300">
              <div>
                <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
                  <h3 className="font-mono text-2xl font-bold text-white tracking-tight">HERMES</h3>
                  <span className="font-mono text-[0.65rem] uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded border border-emerald-500/30">Capital</span>
                </div>
                <p className="text-sm text-neutral-400 leading-relaxed font-sans">
                  Allocates and protects money automatically when market liquidity breaks.
                </p>
              </div>
              <div className="mt-12 pt-4 border-t border-white/10 flex items-center justify-between font-mono text-xs">
                <span className="text-emerald-400 font-medium">LIVE</span>
                <span className="text-white group-hover:translate-x-1 transition-transform">INSPECT →</span>
              </div>
            </Link>

            {/* ORACLE */}
            <Link href="/oracle" className="group rounded-xl border border-white/10 bg-neutral-950 p-8 flex flex-col justify-between hover:border-cyan-500/50 transition-all duration-300">
              <div>
                <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
                  <h3 className="font-mono text-2xl font-bold text-white tracking-tight">ORACLE</h3>
                  <span className="font-mono text-[0.65rem] uppercase tracking-wider text-cyan-400 bg-cyan-950/80 px-2.5 py-1 rounded border border-cyan-500/30">Truth</span>
                </div>
                <p className="text-sm text-neutral-400 leading-relaxed font-sans">
                  Real-time prediction tracking that measures who is right before history is rewritten.
                </p>
              </div>
              <div className="mt-12 pt-4 border-t border-white/10 flex items-center justify-between font-mono text-xs">
                <span className="text-cyan-400 font-medium">LIVE</span>
                <span className="text-white group-hover:translate-x-1 transition-transform">INSPECT →</span>
              </div>
            </Link>

            {/* GLORYA */}
            <Link href="/glorya" className="group rounded-xl border border-white/10 bg-neutral-950 p-8 flex flex-col justify-between hover:border-amber-500/50 transition-all duration-300">
              <div>
                <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
                  <h3 className="font-mono text-2xl font-bold text-white tracking-tight">GLORYA</h3>
                  <span className="font-mono text-[0.65rem] uppercase tracking-wider text-amber-400 bg-amber-950/80 px-2.5 py-1 rounded border border-amber-500/30">Relief</span>
                </div>
                <p className="text-sm text-neutral-400 leading-relaxed font-sans">
                  Autonomous humanitarian aid routing triggered only when intervention shifts the outcome.
                </p>
              </div>
              <div className="mt-12 pt-4 border-t border-white/10 flex items-center justify-between font-mono text-xs">
                <span className="text-amber-400 font-medium">EVALUATING</span>
                <span className="text-white group-hover:translate-x-1 transition-transform">INSPECT →</span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* ── STAGE 4: UN-FAKABLE PROOF ── */}
      <section className="border-t border-white/10 px-6 py-24 bg-neutral-950">
        <div className="mx-auto max-w-3xl text-center sm:text-left">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-neutral-500 mb-3 font-bold">VERIFICATION PROTOCOL</p>
          <h2 className="font-serif text-4xl sm:text-6xl font-medium tracking-tight text-white mb-6">
            Un-fakable Proof.
          </h2>
          <p className="text-lg sm:text-xl text-neutral-300 font-normal mb-4">
            Most platforms change their story after they see what happens.
          </p>
          <p className="text-neutral-400 leading-relaxed text-sm sm:text-base mb-8">
            Solace locks every decision into an un-editable public ledger BEFORE any action is taken. We cannot delete our mistakes, alter our history, or fake our results.
          </p>
          <Link
            href={OBSERVATORY_HERMES_LEDGER_PATH}
            className="inline-flex items-center justify-center px-8 py-4 rounded bg-white text-black font-mono text-xs uppercase tracking-widest font-bold hover:bg-neutral-200 transition-all"
          >
            Verify Full Ledger →
          </Link>
        </div>
      </section>

      {/* ── STAGE 5: OPERATOR STATEMENT ── */}
      <section className="border-t border-white/10 px-6 py-24 bg-black">
        <div className="mx-auto max-w-3xl">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-neutral-500 mb-3 font-bold">OPERATOR</p>
          <h2 className="font-serif text-3xl sm:text-5xl font-medium tracking-tight text-white mb-6">
            One Operator. Zero Excuses.
          </h2>
          <div className="space-y-4 text-neutral-400 text-sm sm:text-base leading-relaxed">
            <p>
              Systems built by large teams become too complex to audit. Solace is engineered and operated by <strong className="text-white font-semibold">Kerby Jean</strong> (ex-Apple Systems Engineer).
            </p>
            <p>
              Building software at Apple requires zero-failure discipline. Solace is built on that same standard: simple enough for one engineer to run, and transparent enough for anyone to verify.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-6 font-mono text-xs uppercase tracking-wider border-t border-white/10 pt-6">
            <Link href="/brief" className="text-white font-bold underline underline-offset-4">
              Read the Brief
            </Link>
            <a href="https://github.com/Jkurbs" target="_blank" rel="noopener noreferrer" className="text-neutral-400 hover:text-white">
              GitHub
            </a>
            <a href="mailto:hello@solace.fyi" className="text-neutral-400 hover:text-white">
              hello@solace.fyi
            </a>
          </div>
        </div>
      </section>

      {/* ── STAGE 6: RESEARCH ── */}
      <section className="border-t border-white/10 px-6 py-20 bg-neutral-950">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center justify-between mb-8 font-mono text-xs">
            <span className="text-white font-bold tracking-widest">// DOCUMENTATION & RESEARCH</span>
            <Link href="/brief" className="text-neutral-400 hover:text-white underline">
              VIEW BRIEF →
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
                <p className="mt-1 text-xs text-neutral-400 leading-relaxed">{item.dek}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}