'use client';

import React, { useState } from 'react';
import HermesLiquidityFieldRender, { MetricFocus } from './HermesLiquidityFieldRender';

interface HomeMetricsBannerProps {
  decisionsCount?: number;
  lastAnchoredLabel?: string;
}

export function HomeMetricsBanner({
  decisionsCount = 142,
  lastAnchoredLabel = '3m',
}: HomeMetricsBannerProps) {
  const [activeMetric, setActiveMetric] = useState<MetricFocus | null>(null);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0c0c0e] p-8">
      <HermesLiquidityFieldRender activeMetric={activeMetric} maxParticles={25000} />

      <div className="relative z-10 grid grid-cols-1 gap-8 md:grid-cols-3">
        <div
          onMouseEnter={() => setActiveMetric('decisions')}
          onMouseLeave={() => setActiveMetric(null)}
          className="group flex cursor-pointer flex-col items-center justify-center rounded-2xl p-4 transition-colors hover:bg-white/5"
        >
          <span className="font-mono text-3xl font-semibold text-white transition-transform duration-300 group-hover:scale-105">
            {decisionsCount}
          </span>
          <span className="mt-1 font-mono text-xs uppercase tracking-wider text-white/50 group-hover:text-white/80">
            overall decisions
          </span>
        </div>

        <div
          onMouseEnter={() => setActiveMetric('verified')}
          onMouseLeave={() => setActiveMetric(null)}
          className="group flex cursor-pointer flex-col items-center justify-center rounded-2xl p-4 transition-colors hover:bg-white/5"
        >
          <div className="flex h-9 items-center justify-center">
            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 transition-transform duration-300 group-hover:scale-110">
              ✓
            </span>
          </div>
          <span className="mt-1 font-mono text-xs uppercase tracking-wider text-white/50 group-hover:text-white/80">
            chain verified
          </span>
        </div>

        <div
          onMouseEnter={() => setActiveMetric('anchored')}
          onMouseLeave={() => setActiveMetric(null)}
          className="group flex cursor-pointer flex-col items-center justify-center rounded-2xl p-4 transition-colors hover:bg-white/5"
        >
          <span className="font-mono text-3xl font-semibold text-white transition-transform duration-300 group-hover:scale-105">
            {lastAnchoredLabel}
          </span>
          <span className="mt-1 font-mono text-xs uppercase tracking-wider text-white/50 group-hover:text-white/80">
            last anchored
          </span>
        </div>
      </div>
    </div>
  );
}