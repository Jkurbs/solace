'use client';

import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

import { calibration } from './calibration';
import type { ActivePrediction } from './oracle/active-predictions';

const easeOut = [0.16, 1, 0.3, 1] as [number, number, number, number];

const ITEM_HEIGHT = 68;
const VISIBLE_COUNT = 3;

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
  const [displayed, setDisplayed] = useState<ActivePrediction[]>([]);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (predictions.length === 0) return undefined;

    const initialCount = Math.min(VISIBLE_COUNT, predictions.length);
    let step = 0;

    const stageTimer = window.setInterval(() => {
      step += 1;
      setDisplayed(predictions.slice(0, Math.min(step, initialCount)));

      if (step >= initialCount) {
        window.clearInterval(stageTimer);
        setStarted(true);
      }
    }, 550);

    return () => window.clearInterval(stageTimer);
  }, [predictions]);

  useEffect(() => {
    if (!started || predictions.length <= VISIBLE_COUNT) return undefined;

    const cycleTimer = window.setInterval(() => {
      setDisplayed((current) => {
        const next = [...current];
        next.shift();

        const lastIndex = predictions.findIndex((p) => p.id === current[current.length - 1]?.id);
        const nextIndex = (lastIndex + 1) % predictions.length;
        next.push(predictions[nextIndex]);

        return next;
      });
    }, 2400);

    return () => window.clearInterval(cycleTimer);
  }, [started, predictions]);

  const listHeight = VISIBLE_COUNT * ITEM_HEIGHT;

  return (
    <section className="border-t border-border px-5 py-16 md:py-24">
      <div className="mx-auto max-w-5xl">
        <motion.div
          className="overflow-hidden rounded-2xl border border-border bg-neutral-100 shadow-2xl shadow-black/10 dark:bg-neutral-900"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: easeOut }}
        >
          <div className="grid gap-8 p-6 md:grid-cols-2 md:gap-10 md:p-8">
            {/* Copy side */}
            <div className="flex flex-col justify-center">
              <h2 className="font-serif text-4xl font-medium tracking-[-0.03em] text-foreground md:text-5xl">
                Oracle
              </h2>
              <p className="mt-3 text-muted-foreground [text-wrap:balance]">
                Estimates the probability of real events, records each estimate before the outcome is known,
                and scores it against what actually happened.
              </p>

              <div className="mt-8 flex items-start gap-8 md:gap-10">
                <div>
                  <strong className="block font-serif text-2xl font-medium tracking-[-0.02em] text-foreground md:text-3xl">
                    {calibration.resolved}
                  </strong>
                  <span className="mt-1 block font-mono text-[0.65rem] lowercase tracking-[0.06em] text-muted-foreground">
                    resolved
                  </span>
                </div>
                <div>
                  <strong className="block font-serif text-2xl font-medium tracking-[-0.02em] text-foreground md:text-3xl">
                    {calibration.brier.toFixed(2)}
                  </strong>
                  <span className="mt-1 block font-mono text-[0.65rem] lowercase tracking-[0.06em] text-muted-foreground">
                    brier score
                  </span>
                </div>
                <div>
                  <strong className="block font-serif text-2xl font-medium tracking-[-0.02em] text-foreground md:text-3xl">
                    {predictions.length > 0 ? predictions.length : '—'}
                  </strong>
                  <span className="mt-1 block font-mono text-[0.65rem] lowercase tracking-[0.06em] text-muted-foreground">
                    active
                  </span>
                </div>
              </div>

              <Link
                href="/oracle"
                className="mt-8 inline-flex w-fit items-center justify-center gap-2 rounded-full border border-foreground bg-foreground px-5 py-2.5 font-mono text-[0.65rem] font-medium uppercase tracking-[0.12em] text-background transition-opacity hover:opacity-90"
              >
                Check the ledger
                <span aria-hidden="true">→</span>
              </Link>
            </div>

            {/* Feed side */}
            <div className="flex flex-col justify-center">
              <div className="mb-3 flex items-center gap-2">
                <p className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-muted-foreground">
                  Latest predictions
                </p>
              </div>

              {predictions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No active BTC or ETH markets right now. The board updates as Kalshi opens new markets.
                </p>
              ) : (
                <ol className="relative" style={{ height: listHeight }}>
                  <AnimatePresence initial={false}>
                    {displayed.map((prediction, index) => (
                      <motion.li
                        key={prediction.id}
                        className="absolute left-0 right-0 flex items-center justify-between gap-4 border-b border-border px-1 py-3"
                        style={{ height: ITEM_HEIGHT, top: index * ITEM_HEIGHT }}
                        initial={{ opacity: 0, y: -16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 16 }}
                        transition={{ duration: 0.45, ease: easeOut }}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            {prediction.question}
                          </p>
                          <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                            {prediction.asset ? (
                              <span
                                className={`inline-flex rounded px-1 py-0.5 text-[0.6rem] font-medium uppercase tracking-wider ${
                                  prediction.asset === 'btc'
                                    ? 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300'
                                    : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                                }`}
                              >
                                {prediction.asset.toUpperCase()}
                              </span>
                            ) : null}
                            <span>{remainingLabel(prediction.resolvesAt)}</span>
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-lg font-medium leading-none text-foreground [font-family:var(--font-display),Georgia,serif]">
                            {formatProbability(prediction.probability)}
                          </p>
                          <p className="mt-1 font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground">
                            probability
                          </p>
                        </div>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ol>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
