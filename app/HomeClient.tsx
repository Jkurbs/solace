'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import SiteHeader from '@/components/site-header';
import SiteFooter from '@/components/site-footer';
import HermesLiquidityFieldRender from './HermesLiquidityFieldRender';
import { OBSERVATORY_HERMES_LEDGER_PATH } from '@/features/observatory/paths';

export default function BeautifulHermesPage({ telemetry, chainHead }: { telemetry?: any; chainHead?: any }) {
  return (
    <main className="min-h-screen bg-[#070709] text-[#EDEDED] antialiased selection:bg-emerald-500/20 selection:text-emerald-200">
      <SiteHeader />

      {/* ── HERO & RADAR STAGE ── */}
      <section className="relative overflow-hidden pt-24 pb-20 md:pt-32 md:pb-28">
        
        {/* Background Visual Artifact: Interactive/Living Canvas */}
        <div className="absolute inset-0 w-full h-full pointer-events-none opacity-40 mix-blend-screen">
          <HermesLiquidityFieldRender maxParticles={25000} />
          {/* Radial vignette for cinematic focus */}
          <div className="absolute inset-0 bg-radial-gradient from-transparent via-[#070709]/60 to-[#070709]" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-6">
          
          {/* Eyebrow / Live Indicator */}
          <motion.div 
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2.5 px-3 py-1 rounded-full border border-white/10 bg-white/[0.03] backdrop-blur-md text-[0.7rem] font-mono tracking-widest uppercase text-muted"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-foreground/90">Hermes Autonomous Engine</span>
          </motion.div>

          {/* Hero Headline */}
          <motion.h1 
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-6 text-5xl sm:text-7xl font-serif font-light tracking-tight leading-[1.08] text-balance"
          >
            Software that protects capital when markets turn violent.
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-6 text-lg md:text-xl text-neutral-400 font-sans font-light leading-relaxed max-w-2xl text-balance"
          >
            Hermes operates on an absolute rule: when market uncertainty spikes, it stands down and holds cash. Every decision is cryptographically sealed before execution.
          </motion.p>

          {/* ── THE INSTRUMENT COCKPIT (Glassmorphic Telemetry Card) ── */}
          <motion.div 
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-12 rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden group"
          >
            {/* Subtle top edge highlight */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

            <div className="flex flex-wrap items-center justify-between border-b border-white/5 pb-4 gap-4">
              <div className="space-y-0.5">
                <p className="text-[0.65rem] uppercase tracking-[0.2em] font-mono text-neutral-500">Capital Posture</p>
                <p className="font-mono text-xl font-medium tracking-tight text-emerald-400 flex items-center gap-2">
                  [ DEFENSIVE · 0% EXPOSURE ]
                </p>
              </div>
              
              <div className="text-right">
                <span className="inline-block px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 text-xs font-mono border border-emerald-500/20">
                  Sitting in Cash
                </span>
              </div>
            </div>

            {/* Readout Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 font-mono">
              <div>
                <p className="text-[0.65rem] uppercase tracking-[0.18em] text-neutral-500">Market Condition</p>
                <p className="text-sm font-medium text-neutral-200 mt-1">High Volatility Expansion</p>
              </div>
              <div>
                <p className="text-[0.65rem] uppercase tracking-[0.18em] text-neutral-500">Execution Rule</p>
                <p className="text-sm font-medium text-neutral-200 mt-1">Liquidity Delta &gt; 2.5x</p>
              </div>
              <div>
                <p className="text-[0.65rem] uppercase tracking-[0.18em] text-neutral-500">Proof Status</p>
                <p className="text-sm font-medium text-neutral-200 mt-1 flex items-center gap-1.5">
                  <span className="text-emerald-400">✓</span> Sealed to Ledger
                </p>
              </div>
            </div>

            {/* Live Hash Footer */}
            {chainHead && (
              <div className="mt-6 pt-4 border-t border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-neutral-500">
                <span className="truncate">
                  Record #{chainHead.rowNumber} · <span className="text-neutral-400">{chainHead.hash.slice(0, 24)}...</span>
                </span>
                <span className="text-neutral-400">{chainHead.sealedAtLabel}</span>
              </div>
            )}
          </motion.div>

          {/* Primary CTA */}
          <div className="mt-8 flex flex-wrap gap-4 items-center">
            <Link 
              href={OBSERVATORY_HERMES_LEDGER_PATH} 
              className="px-6 py-3 rounded-lg bg-neutral-100 text-neutral-900 font-medium text-sm hover:bg-white transition-all shadow-lg hover:shadow-white/10 flex items-center gap-2 group"
            >
              Verify Full Decision Ledger
              <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
            </Link>
          </div>

        </div>
      </section>

      {/* ── CORE ARCHITECTURE (Elegant Typography Layout) ── */}
      <section className="border-t border-white/5 py-20 md:py-28 bg-[#09090C]">
        <div className="max-w-4xl mx-auto px-6">
          <p className="text-xs font-mono uppercase tracking-[0.2em] text-neutral-500 mb-3">Architecture</p>
          <h2 className="text-3xl md:text-4xl font-serif font-light tracking-tight mb-12">
            Designed for survival, not prediction.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-3 relative pl-6 border-l border-white/10">
              <span className="font-mono text-xs text-neutral-500">01</span>
              <h3 className="text-lg font-medium text-neutral-200">Defensive Default</h3>
              <p className="text-sm text-neutral-400 leading-relaxed font-light">
                Most quantitative models attempt to predict future direction. Hermes does the opposite: it identifies structural breakdown and steps aside into cash until stability returns.
              </p>
            </div>

            <div className="space-y-3 relative pl-6 border-l border-white/10">
              <span className="font-mono text-xs text-neutral-500">02</span>
              <h3 className="text-lg font-medium text-neutral-200">Zero Hindsight Bias</h3>
              <p className="text-sm text-neutral-400 leading-relaxed font-light">
                Traditional funds quietly hide bad quarters. Hermes locks every position change to an immutable public record before execution, ensuring complete transparency.
              </p>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}