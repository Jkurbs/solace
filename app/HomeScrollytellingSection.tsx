'use client';

import React, { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform, useMotionValueEvent } from 'framer-motion';
import Link from 'next/link';
import HermesLiquidityFieldRender, { MetricFocus } from './HermesLiquidityFieldRender';
import { OBSERVATORY_HERMES_LEDGER_PATH } from '@/features/observatory/paths';

interface HomeScrollytellingSectionProps {
  sealedDecisions?: number | null;
  lastAnchoredLabel?: string;
  isVerified?: boolean;
}

const STEPS: { id: MetricFocus; title: string; subtitle: string; description: string }[] = [
  {
    id: 'decisions',
    title: '01. Market Observation',
    subtitle: '142 Decisions Formed',
    description: 'Hermes ingests market structure, liquidity paths, and order flow dynamics to synthesize positioning decisions in real time.',
  },
  {
    id: 'verified',
    title: '02. Execution & Reversal Watch',
    subtitle: 'Chain Verified Path',
    description: 'Orders route through dynamic liquidity cascades with zero human intervention, evaluating risk parameters continuously.',
  },
  {
    id: 'anchored',
    title: '03. Cryptographic Anchor',
    subtitle: '3m Last Anchored',
    description: 'Every decision state is serialized, hashed via SHA-256, and permanently written into an immutable public ledger sequence.',
  },
];

export function HomeScrollytellingSection({
  sealedDecisions = 142,
  lastAnchoredLabel = '3m',
  isVerified = true,
}: HomeScrollytellingSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeMetric, setActiveMetric] = useState<MetricFocus>('decisions');

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  // Map scroll progress (0.0 to 1.0) across the 3 story cards
  useMotionValueEvent(scrollYProgress, 'change', (latest) => {
    if (latest < 0.33) {
      setActiveMetric('decisions');
    } else if (latest < 0.66) {
      setActiveMetric('verified');
    } else {
      setActiveMetric('anchored');
    }
  });

  return (
    <section ref={containerRef} className="relative h-[300vh] w-full bg-[#08080a]">
      {/* Sticky Viewport Container */}
      <div className="sticky top-0 flex h-screen w-full items-center justify-center overflow-hidden">
        {/* Dynamic 3D Particle Canvas Background */}
        <HermesLiquidityFieldRender activeMetric={activeMetric} maxParticles={30000} />

        {/* Story Text Overlay Cards */}
        <div className="relative z-10 mx-auto grid max-w-6xl grid-cols-1 gap-8 px-6 lg:grid-cols-2 lg:items-center">
          {/* Left Column: Fixed Headline */}
          <div className="flex flex-col space-y-4">
            <span className="font-mono text-xs font-semibold uppercase tracking-widest text-emerald-400">
              Cryptographic Telemetry
            </span>
            <h2 className="text-3xl font-bold tracking-tight text-white md:text-5xl">
              How every decision becomes immutable.
            </h2>
            <p className="max-w-md text-sm text-white/60">
              Scroll down to trace the lifecycle from observation to chain anchor.
            </p>

            <div className="pt-4">
              <Link
                href={OBSERVATORY_HERMES_LEDGER_PATH}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-5 py-2.5 text-xs font-medium text-white transition-colors hover:bg-white/10"
              >
                Inspect Public Ledger <span className="text-sm">→</span>
              </Link>
            </div>
          </div>

          {/* Right Column: Dynamic Step Cards */}
          <div className="relative h-64 w-full">
            {STEPS.map((step) => {
              const isActive = activeMetric === step.id;
              return (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{
                    opacity: isActive ? 1 : 0,
                    y: isActive ? 0 : -20,
                    scale: isActive ? 1 : 0.95,
                  }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className={`absolute inset-0 flex flex-col justify-between rounded-3xl border border-white/10 bg-[#121215]/80 p-8 backdrop-blur-xl transition-all ${
                    isActive ? 'pointer-events-auto border-emerald-500/30' : 'pointer-events-none'
                  }`}
                >
                  <div>
                    <span className="font-mono text-xs font-semibold text-white/40">
                      {step.title}
                    </span>
                    <h3 className="mt-2 font-mono text-2xl font-bold text-white">
                      {step.id === 'decisions' && (sealedDecisions?.toLocaleString('en-US') ?? step.subtitle)}
                      {step.id === 'verified' && (isVerified ? '✓ Chain Verified' : 'Unverified')}
                      {step.id === 'anchored' && `Anchored ${lastAnchoredLabel}`}
                    </h3>
                    <p className="mt-4 text-xs leading-relaxed text-white/70">
                      {step.description}
                    </p>
                  </div>

                  {/* Step Progress Bar Indicator */}
                  <div className="mt-6 flex gap-2">
                    {STEPS.map((s) => (
                      <div
                        key={s.id}
                        className={`h-1 flex-1 rounded-full transition-colors duration-500 ${
                          s.id === activeMetric ? 'bg-emerald-400' : 'bg-white/10'
                        }`}
                      />
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}