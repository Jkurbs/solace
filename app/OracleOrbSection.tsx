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
    <div className="flex h-full min-h-0 flex-1 flex-col">
      {sampleBoard ? (
        <p className="mb-2 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-white/40">Sample</p>
      ) : null}
      <div ref={listRef} className="relative min-h-0 flex-1 overflow-hidden">
        <AnimatePresence initial={false} mode="popLayout">
          {displayed.map(({ prediction, key }) => (
            <motion.div
              key={key}
              layout="position"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="grid grid-cols-[4.75rem_minmax(0,1fr)] items-center gap-4 border-b border-white/[0.08] px-1"
              style={{ height: ITEM_HEIGHT }}
            >
              <p className="font-medium tabular-nums leading-none text-white [font-family:var(--font-display),Georgia,serif] text-[1.65rem]">
                {formatProbability(prediction.probability)}
              </p>
              <div className="min-w-0">
                <p className="truncate text-sm text-white/80">{prediction.question}</p>
                <p className="mt-0.5 text-xs text-white/40">
                  {prediction.illustrative ? 'Sample' : remainingLabel(prediction.resolvesAt)}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}