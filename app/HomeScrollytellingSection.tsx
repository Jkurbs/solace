'use client';

import React, { useRef, useState } from 'react';
import { motion, useScroll, useMotionValueEvent, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import HermesLiquidityFieldRender, { MetricFocus } from './HermesLiquidityFieldRender';
import { OBSERVATORY_HERMES_LEDGER_PATH } from '@/features/observatory/paths';

interface HomeScrollytellingSectionProps {
  sealedDecisions?: number | null;
  lastAnchoredLabel?: string;
  isVerified?: boolean;
}

const STEPS = [
  {
    id: 'decisions' as MetricFocus,
    stepNum: '01',
    status: 'RECORDING',
    title: 'Decision Capture',
    subtitle: 'Recorded at the millisecond.',
    description:
      'The moment a machine commits to a decision, raw intent and market context are captured instantly. No retroactive edits, no silent overrides.',
    hash: '0x00000000000000000000000000000000',
  },
  {
    id: 'verified' as MetricFocus,
    stepNum: '02',
    status: 'SEALED',
    title: 'Cryptographic Hashing',
    subtitle: 'Signed, stamped, and locked.',
    description:
      'The decision state is condensed into a unique SHA-256 fingerprint. Altering a single byte in the decision payload breaks the signature instantly.',
    hash: 'e3b0c44298fc1c149afbf4c8996fb924',
  },
  {
    id: 'anchored' as MetricFocus,
    stepNum: '03',
    status: 'ANCHORED (READ-ONLY)',
    title: 'Immutable Anchor',
    subtitle: 'Written where no one can erase it.',
    description:
      'The hash is published directly to a public git commit and distributed ledger. Not even its creator can alter what was done.',
    hash: '27ae41e4649b934ca495991b7852b855',
  },
];

const ORIGINAL_PAYLOAD = 'DECISION_142: BUY_EXECUTE_ETH_VOL_0.84';
const VALID_HASH = '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08';
const TAMPERED_HASH = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

export function HomeScrollytellingSection({
  sealedDecisions = 142,
  lastAnchoredLabel = '3m',
  isVerified = true,
}: HomeScrollytellingSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeMetric, setActiveMetric] = useState<MetricFocus>('decisions');
  const [tamperText, setTamperText] = useState(ORIGINAL_PAYLOAD);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  useMotionValueEvent(scrollYProgress, 'change', (latest) => {
    if (latest < 0.33) {
      setActiveMetric('decisions');
    } else if (latest < 0.66) {
      setActiveMetric('verified');
    } else {
      setActiveMetric('anchored');
    }
  });

  const activeIndex = STEPS.findIndex((s) => s.id === activeMetric);
  const isTampered = tamperText !== ORIGINAL_PAYLOAD;

  return (
    <section ref={containerRef} className="relative h-[300vh] w-full bg-[#08080a]">
      {/* Sticky Viewport Container */}
      <div className="sticky top-0 flex h-screen w-full items-center justify-center overflow-hidden">
        {/* Dynamic 3D Particle Canvas Background */}
        <HermesLiquidityFieldRender activeMetric={activeMetric} maxParticles={30000} />

        <div className="relative z-10 mx-auto grid max-w-6xl grid-cols-1 gap-12 px-6 lg:grid-cols-12 lg:items-center">
          {/* Left Column: Fixed Narrative Header */}
          <div className="flex flex-col space-y-4 lg:col-span-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-mono font-medium text-emerald-400 w-fit">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Proof of Intention
            </div>

            <h2 className="text-3xl font-bold tracking-tight text-white md:text-5xl">
              Decisions that cannot be changed.
            </h2>
            <p className="text-sm leading-relaxed text-white/60">
              Trace how Hermes moves from active market analysis to permanent, tamper-evident cryptographic public proof.
            </p>

            {/* Stepper Node Chain */}
            <div className="pt-6">
              <div className="flex items-center gap-3">
                {STEPS.map((step, idx) => {
                  const isActive = idx === activeIndex;
                  const isPast = idx < activeIndex;

                  return (
                    <React.Fragment key={step.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full font-mono text-xs transition-all duration-500 ${
                            isActive
                              ? 'border-2 border-emerald-400 bg-emerald-500/20 font-bold text-white shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                              : isPast
                                ? 'border border-emerald-500/50 bg-emerald-950/40 text-emerald-400'
                                : 'border border-white/10 bg-white/5 text-white/40'
                          }`}
                        >
                          {isPast ? '✓' : step.stepNum}
                        </div>
                      </div>
                      {idx < STEPS.length - 1 && (
                        <div
                          className={`h-0.5 flex-1 transition-colors duration-500 ${
                            idx < activeIndex ? 'bg-emerald-500/60' : 'bg-white/10'
                          }`}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            <div className="pt-4">
              <Link
                href={OBSERVATORY_HERMES_LEDGER_PATH}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-5 py-2.5 text-xs font-medium text-white transition-all hover:bg-white/10 hover:border-white/40"
              >
                Inspect Public Ledger <span className="text-sm">→</span>
              </Link>
            </div>
          </div>

          {/* Right Column: Terminal Proof Card */}
          <div className="relative h-[380px] w-full lg:col-span-7">
            <AnimatePresence mode="wait">
              {STEPS.map((step) => {
                if (step.id !== activeMetric) return null;

                return (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, y: 20, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.98 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute inset-0 flex flex-col justify-between overflow-hidden rounded-2xl border border-white/15 bg-[#0f0f13]/90 p-6 backdrop-blur-2xl shadow-2xl"
                  >
                    {/* Terminal Header Bar */}
                    <div className="flex items-center justify-between border-b border-white/10 pb-4">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
                        <span className="ml-2 font-mono text-xs text-white/40">
                          ledger_proof_node_{step.stepNum}.sh
                        </span>
                      </div>
                      <span
                        className={`rounded-md px-2 py-0.5 font-mono text-[10px] uppercase font-semibold tracking-wide ${
                          step.id === 'decisions'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                            : step.id === 'verified'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        ● {step.status}
                      </span>
                    </div>

                    {/* Step Body */}
                    <div className="my-auto space-y-3 py-2">
                      <span className="font-mono text-xs uppercase tracking-wider text-emerald-400/80">
                        {step.title}
                      </span>
                      <h3 className="font-mono text-2xl font-bold tracking-tight text-white">
                        {step.subtitle}
                      </h3>
                      <p className="text-xs leading-relaxed text-white/70">
                        {step.description}
                      </p>

                      {/* Step 3 Tamper Interactive Demo */}
                      {step.id === 'anchored' && (
                        <div className="mt-3 rounded-lg border border-white/10 bg-black/40 p-3 space-y-2">
                          <div className="flex items-center justify-between text-[11px] font-mono text-white/60">
                            <span>Interactive Tamper Test:</span>
                            <span className={isTampered ? 'text-rose-400' : 'text-emerald-400'}>
                              {isTampered ? '❌ HASH MISMATCH' : '✓ SIGNATURE MATCH'}
                            </span>
                          </div>
                          <input
                            type="text"
                            value={tamperText}
                            onChange={(e) => setTamperText(e.target.value)}
                            className={`w-full rounded border bg-black/60 px-2.5 py-1.5 font-mono text-xs text-white outline-none transition-colors ${
                              isTampered
                                ? 'border-rose-500/60 focus:border-rose-500'
                                : 'border-emerald-500/40 focus:border-emerald-500'
                            }`}
                          />
                          <div className="font-mono text-[10px] break-all text-white/40">
                            SHA-256:{' '}
                            <span className={isTampered ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                              {isTampered ? TAMPERED_HASH : VALID_HASH}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Terminal Footer Hash Output */}
                    {step.id !== 'anchored' && (
                      <div className="rounded-lg border border-white/5 bg-black/50 p-3 font-mono text-[11px] text-white/50">
                        <span className="text-white/30">PAYLOAD_HASH:</span> {step.hash}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}