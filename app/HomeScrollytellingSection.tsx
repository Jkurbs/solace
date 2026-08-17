'use client';

import React, { useRef, useState } from 'react';
import { motion, useScroll, useMotionValueEvent, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { OBSERVATORY_HERMES_LEDGER_PATH } from '@/features/observatory/paths';

export type MetricFocus = 'decisions' | 'verified' | 'anchored';

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
      'The moment Hermes commits to a decision, raw intent and market context are captured instantly. No retroactive edits, no silent overrides.',
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
    <section ref={containerRef} className="relative h-[300vh] w-full bg-[#09090b] text-zinc-100">
      {/* Background Grid & Vignette (Subtle, Serious Studio Tone) */}
      <div className="sticky top-0 flex h-screen w-full items-center justify-center overflow-hidden border-y border-zinc-800/60 bg-[#09090b]">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#27272a15_1px,transparent_1px),linear-gradient(to_bottom,#27272a15_1px,transparent_1px)] bg-[size:3rem_3rem]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(24,24,27,0.8)_0%,#09090b_100%)]" />

        <div className="relative z-10 mx-auto grid max-w-6xl grid-cols-1 gap-12 px-6 lg:grid-cols-12 lg:items-center">
          {/* Left Column: Serious Narrative Header */}
          <div className="flex flex-col space-y-5 lg:col-span-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-700/60 bg-zinc-900/80 px-3 py-1 text-xs font-mono font-medium text-zinc-300 w-fit backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-zinc-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-zinc-300" />
              </span>
              Proof of Intention
            </div>

            <h2 className="text-3xl font-bold tracking-tight text-white md:text-5xl">
              Decisions that cannot be changed.
            </h2>
            <p className="text-sm leading-relaxed text-zinc-400">
              Trace how Hermes moves from active market analysis to permanent, tamper-evident cryptographic public proof.
            </p>

            {/* Stepper Node Chain */}
            <div className="pt-4">
              <div className="flex items-center gap-3">
                {STEPS.map((step, idx) => {
                  const isActive = idx === activeIndex;
                  const isPast = idx < activeIndex;

                  return (
                    <React.Fragment key={step.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-lg font-mono text-xs transition-all duration-300 ${
                            isActive
                              ? 'border border-zinc-400 bg-zinc-100 text-zinc-950 font-bold shadow-md'
                              : isPast
                                ? 'border border-zinc-700 bg-zinc-900/80 text-zinc-300'
                                : 'border border-zinc-800/80 bg-zinc-950/40 text-zinc-600'
                          }`}
                        >
                          {isPast ? '✓' : step.stepNum}
                        </div>
                      </div>
                      {idx < STEPS.length - 1 && (
                        <div
                          className={`h-px flex-1 transition-colors duration-500 ${
                            idx < activeIndex ? 'bg-zinc-600' : 'bg-zinc-800/60'
                          }`}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            <div className="pt-2">
              <Link
                href={OBSERVATORY_HERMES_LEDGER_PATH}
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900/80 px-4 py-2.5 text-xs font-mono font-medium text-zinc-200 transition-all hover:border-zinc-500 hover:bg-zinc-800"
              >
                Inspect Public Ledger <span className="text-sm">→</span>
              </Link>
            </div>
          </div>

          {/* Right Column: Serious Audit Card */}
          <div className="relative h-[380px] w-full lg:col-span-7">
            <AnimatePresence mode="wait">
              {STEPS.map((step) => {
                if (step.id !== activeMetric) return null;

                return (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -16 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute inset-0 flex flex-col justify-between overflow-hidden rounded-xl border border-zinc-800 bg-[#121215] p-6 shadow-2xl backdrop-blur-xl"
                  >
                    {/* Header Bar */}
                    <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
                      <div className="flex items-center gap-2 font-mono text-xs text-zinc-500">
                        <span className="h-2 w-2 rounded-full bg-zinc-600" />
                        node_proof_ledger_{step.stepNum}
                      </div>
                      <span
                        className={`rounded px-2 py-0.5 font-mono text-[10px] uppercase font-semibold tracking-wider ${
                          step.id === 'decisions'
                            ? 'border border-zinc-700 bg-zinc-800/60 text-zinc-300'
                            : step.id === 'verified'
                              ? 'border border-amber-900/40 bg-amber-950/20 text-amber-400'
                              : 'border border-emerald-900/40 bg-emerald-950/20 text-emerald-400'
                        }`}
                      >
                        ● {step.status}
                      </span>
                    </div>

                    {/* Step Body */}
                    <div className="my-auto space-y-3 py-2">
                      <span className="font-mono text-xs uppercase tracking-widest text-zinc-400">
                        {step.title}
                      </span>
                      <h3 className="font-mono text-2xl font-bold tracking-tight text-white">
                        {step.subtitle}
                      </h3>
                      <p className="text-xs leading-relaxed text-zinc-400">
                        {step.description}
                      </p>

                      {/* Step 3 Tamper Test */}
                      {step.id === 'anchored' && (
                        <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950 p-3 space-y-2">
                          <div className="flex items-center justify-between font-mono text-[11px] text-zinc-400">
                            <span>Interactive Tamper Test:</span>
                            <span className={isTampered ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                              {isTampered ? '❌ HASH MISMATCH' : '✓ SIGNATURE MATCH'}
                            </span>
                          </div>
                          <input
                            type="text"
                            value={tamperText}
                            onChange={(e) => setTamperText(e.target.value)}
                            className={`w-full rounded border bg-zinc-900 px-3 py-1.5 font-mono text-xs text-zinc-100 outline-none transition-colors ${
                              isTampered
                                ? 'border-rose-500/80 focus:border-rose-500'
                                : 'border-zinc-700 focus:border-zinc-500'
                            }`}
                          />
                          <div className="font-mono text-[10px] break-all text-zinc-500">
                            SHA-256:{' '}
                            <span className={isTampered ? 'text-rose-400 font-bold' : 'text-zinc-300'}>
                              {isTampered ? TAMPERED_HASH : VALID_HASH}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Terminal Footer Hash Output */}
                    {step.id !== 'anchored' && (
                      <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/80 p-3 font-mono text-[11px] text-zinc-400">
                        <span className="text-zinc-600">PAYLOAD_HASH:</span> {step.hash}
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