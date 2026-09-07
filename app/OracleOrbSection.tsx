'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

import { useFitSlots } from './use-fit-slots';

import type { ActivePrediction } from './oracle/active-predictions';

const ITEM_HEIGHT = 64;
const CYCLE_MS = 2400;

type OracleOrbSectionProps = {
  predictions: ActivePrediction[];
};

function formatProbability(n: number) {
  return `${Math.round(n * 100)}%`;
}

function remainingLabel(iso: string) {
  const end = new Date(iso).getTime();
  const ms = end - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return 'Resolving';

  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

  if (days >= 2) return `${days} days`;
  if (days === 1) return hours > 0 ? `1d ${hours}h` : '1 day';
  if (hours >= 1) return `${hours}h`;
  return '< 1h';
}

export default function OracleOrbSection({ predictions }: OracleOrbSectionProps) {
  const { ref: listRef, slots } = useFitSlots(ITEM_HEIGHT, 3);
  const [offset, setOffset] = useState(0);
  const sampleBoard = predictions.length > 0 && predictions.every((prediction) => prediction.illustrative);

  useEffect(() => {
    if (predictions.length < 2 || slots < 1) {
      return undefined;
    }

    const cycle = window.setInterval(() => {
      setOffset((current) => current + 1);
    }, CYCLE_MS);

    return () => window.clearInterval(cycle);
  }, [predictions.length, slots]);

  const displayed =
    predictions.length === 0 || slots < 1
      ? []
      : Array.from({ length: slots }, (_, index) => {
          const prediction = predictions[(offset + index) % predictions.length];
          return { prediction, key: `${prediction.id}:${offset + index}` };
        });

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <p className="font-mono text-[0.65rem] font-medium uppercase tracking-[0.16em] text-white/50">
          {sampleBoard ? 'Sample predictions' : 'Latest predictions'}
        </p>
      </div>

      {/* Feed container */}
      <div ref={listRef} className="relative min-h-0 flex-1 overflow-hidden">
        <AnimatePresence initial={false} mode="popLayout">
          {displayed.map(({ prediction, key }) => (
            <motion.div
              key={key}
              layout="position"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center justify-between gap-4 border-b border-white/10 px-1 py-3"
              style={{ height: ITEM_HEIGHT }}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white/90">
                  {prediction.question}
                </p>
                <p className="mt-0.5 flex items-center gap-2 text-xs text-white/40">
                  {prediction.asset && (
                    <span
                      className={`inline-flex rounded px-1 py-0.5 text-[0.6rem] font-medium uppercase tracking-wider ${
                        prediction.asset === 'btc'
                          ? 'bg-orange-500/20 text-orange-300'
                          : 'bg-indigo-500/20 text-indigo-300'
                      }`}
                    >
                      {prediction.asset.toUpperCase()}
                    </span>
                  )}
                  <span>{prediction.illustrative ? 'Sample' : remainingLabel(prediction.resolvesAt)}</span>
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xl font-medium leading-none text-white [font-family:var(--font-display),Georgia,serif]">
                  {formatProbability(prediction.probability)}
                </p>
                <p className="mt-1 font-mono text-[0.6rem] uppercase tracking-wider text-white/40">
                  probability
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}