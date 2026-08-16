'use client';

import Link from 'next/link';
import { motion, useInView, useMotionValue, useTransform, animate, AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

import type { HermesLedgerRow } from '@/features/hermes-ledger/store';
import { OBSERVATORY_HERMES_LEDGER_PATH } from '@/features/observatory/paths';

type HermesDashboardPreviewProps = {
  decisions: HermesLedgerRow[];
};

const easeOut = [0.16, 1, 0.3, 1] as [number, number, number, number];

function useCountUp(target: number, duration = 1.6) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) =>
    new Intl.NumberFormat('en-US', {
      currency: 'USD',
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
      style: 'currency',
    }).format(latest),
  );

  useEffect(() => {
    if (!inView) return undefined;

    const controls = animate(count, target, { duration, ease: 'easeOut' });
    return controls.stop;
  }, [inView, target, duration, count]);

  return { ref, rounded };
}

function formatActivityDate(value: string) {
  const date = new Date(value);
  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    timeZone: 'America/New_York',
  });
}

function formatActivitySummary(row: HermesLedgerRow) {
  if (row.note) {
    return row.note;
  }

  if (row.decision) {
    return row.decision;
  }

  return 'Hermes decision recorded';
}

function illustrativeReturn(index: number) {
  const values = [124.5, -45.2, 78.0, -12.3, 203.8, -67.5, 156.2];
  const value = values[index % values.length];

  return {
    formatted: new Intl.NumberFormat('en-US', {
      currency: 'USD',
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
      signDisplay: 'always',
      style: 'currency',
    }).format(value),
    positive: value >= 0,
  };
}

export default function HermesDashboardPreview({ decisions }: HermesDashboardPreviewProps) {
  const { ref: valueRef, rounded: valueRounded } = useCountUp(12842.17);
  const [displayed, setDisplayed] = useState<HermesLedgerRow[]>([]);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (decisions.length === 0) return undefined;

    // Stage the initial items one by one so they feel like a live incoming feed.
    const initialCount = Math.min(4, decisions.length);
    let step = 0;

    const stageTimer = window.setInterval(() => {
      step += 1;
      setDisplayed(decisions.slice(0, Math.min(step, initialCount)));

      if (step >= initialCount) {
        window.clearInterval(stageTimer);
        setStarted(true);
      }
    }, 650);

    return () => window.clearInterval(stageTimer);
  }, [decisions]);

  useEffect(() => {
    if (!started || decisions.length <= 4) return undefined;

    const cycleTimer = window.setInterval(() => {
      setDisplayed((current) => {
        const next = [...current];
        next.shift();

        const lastIndex = decisions.findIndex((d) => d.recordId === current[current.length - 1]?.recordId);
        const nextIndex = (lastIndex + 1) % decisions.length;
        next.push(decisions[nextIndex]);

        return next;
      });
    }, 2200);

    return () => window.clearInterval(cycleTimer);
  }, [started, decisions]);

  return (
    <section className="border-t border-border bg-background px-5 py-16 md:py-24">
      <div className="mx-auto max-w-5xl">
        <motion.div
          className="hx-window hermes-preview-window"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: easeOut }}
        >
          <div className="hx-window-bar">
            <span className="hx-window-dots">
              <i />
              <i />
              <i />
            </span>
            <span className="hx-window-url">app.solace.fyi/dashboard</span>
            <span className="hx-window-spacer" />
          </div>

          <div className="hx-window-view is-static p-5 md:p-8">
            <div className="rounded-xl border border-white/10 bg-[#0d0d0b] p-5 md:p-6">
              <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-6">
                <div>
                  <p className="mb-1 font-mono text-[0.6rem] font-medium uppercase tracking-[0.16em] text-neutral-500">
                    Portfolio value
                  </p>
                  <motion.span
                    ref={valueRef}
                    className="block text-4xl font-medium tracking-[-0.01em] text-neutral-50 [font-family:var(--font-display),Georgia,serif]"
                  >
                    {valueRounded}
                  </motion.span>
                </div>
                <div className="text-right">
                  <p className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-neutral-500">
                    Today&apos;s change
                  </p>
                  <p className="mt-1 text-sm font-medium text-emerald-400">+$84.22 (+0.66%)</p>
                </div>
              </div>

              <div className="mb-6">
                <div className="mb-3 flex items-center gap-2">
                  <p className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-neutral-500">
                    Latest decisions
                  </p>
                  {started && decisions.length > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[0.6rem] font-medium text-emerald-300">
                      <span className="h-1 w-1 animate-pulse rounded-full bg-emerald-400" />
                      Live
                    </span>
                  ) : null}
                </div>

                {decisions.length === 0 ? (
                  <p className="text-sm text-neutral-400">
                    No decisions recorded yet. The ledger updates as Hermes acts.
                  </p>
                ) : (
                  <ol className="grid gap-0">
                    <AnimatePresence mode="popLayout" initial={false}>
                      {displayed.map((row, index) => {
                        const ret = illustrativeReturn(decisions.findIndex((d) => d.recordId === row.recordId));

                        return (
                          <motion.li
                            key={row.recordId}
                            className="flex items-center justify-between gap-4 border-t border-white/10 py-3 first:border-t-0 first:pt-0 last:pb-0"
                            initial={{ opacity: 0, x: -24, scale: 0.98 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 24, scale: 0.98 }}
                            layout
                            transition={{ duration: 0.4, ease: easeOut }}
                          >
                            <div className="flex items-center gap-3">
                              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/5 text-[0.65rem] text-neutral-400">
                                {index + 1}
                              </span>
                              <div>
                                <p className="text-sm font-medium text-neutral-100">
                                  {formatActivitySummary(row)}
                                </p>
                                <p className="text-xs text-neutral-500">{formatActivityDate(row.sealedAt)}</p>
                              </div>
                            </div>
                            <span
                              className={`text-sm font-medium tabular-nums ${
                                ret.positive ? 'text-emerald-400' : 'text-red-400'
                              }`}
                            >
                              {ret.formatted}
                            </span>
                          </motion.li>
                        );
                      })}
                    </AnimatePresence>
                  </ol>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 border-t border-white/10 pt-5">
                <Link
                  href={OBSERVATORY_HERMES_LEDGER_PATH}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-400 transition-colors hover:text-neutral-100"
                >
                  Inspect ledger
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Link>
                <Link
                  href="/hermes"
                  className="inline-flex items-center gap-1.5 rounded-md bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-950 transition-colors hover:bg-white"
                >
                  Run simulation
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
