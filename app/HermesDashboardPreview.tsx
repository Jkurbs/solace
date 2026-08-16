'use client';

import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

import type { HermesLedgerRow } from '@/features/hermes-ledger/store';
import { OBSERVATORY_HERMES_LEDGER_PATH } from '@/features/observatory/paths';

type HermesDashboardPreviewProps = {
  decisions: HermesLedgerRow[];
};

const ITEM_HEIGHT = 56;
const VISIBLE_COUNT = 4;

function formatActivityDate(value: string) {
  const date = new Date(value);
  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    timeZone: 'America/New_York',
  });
}

function formatActivitySummary(row: HermesLedgerRow) {
  if (row.note) return row.note;
  if (row.decision) return row.decision;
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
  const [displayed, setDisplayed] = useState<HermesLedgerRow[]>([]);
  const [started, setStarted] = useState(false);

  // Initial staging: show items one by one
  useEffect(() => {
    if (decisions.length === 0) return undefined;
    const initialCount = Math.min(VISIBLE_COUNT, decisions.length);
    let step = 0;
    const timer = setInterval(() => {
      step += 1;
      setDisplayed(decisions.slice(0, Math.min(step, initialCount)));
      if (step >= initialCount) {
        clearInterval(timer);
        setStarted(true);
      }
    }, 550);
    return () => clearInterval(timer);
  }, [decisions]);

  // Cycling: remove first, append next
  useEffect(() => {
    if (!started || decisions.length <= VISIBLE_COUNT) return undefined;
    const cycle = setInterval(() => {
      setDisplayed((current) => {
        if (current.length === 0) return current;
        const next = [...current];
        next.shift(); // remove oldest
        // find the next item to append (cyclic)
        const lastId = current[current.length - 1]?.recordId;
        const lastIndex = decisions.findIndex((d) => d.recordId === lastId);
        const nextIndex = (lastIndex + 1) % decisions.length;
        next.push(decisions[nextIndex]);
        return next;
      });
    }, 2400);
    return () => clearInterval(cycle);
  }, [started, decisions]);

  return (
    <motion.div
      className="h-full overflow-hidden rounded-2xl border border-border bg-neutral-100 dark:bg-neutral-900"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="p-6 md:p-8">
        {/* Header: title + explore button */}
        <div className="mb-4 flex items-center justify-between">
          <p className="font-mono text-[0.6rem] font-medium uppercase tracking-[0.16em] text-muted">
            Latest decisions
          </p>
        </div>

        {/* Feed container */}
        <div
          className="relative overflow-hidden"
          style={{ height: VISIBLE_COUNT * ITEM_HEIGHT }}
        >
          <AnimatePresence initial={false} mode="popLayout">
            {displayed.map((row, index) => {
              const originalIndex = decisions.findIndex((d) => d.recordId === row.recordId);
              const ret = illustrativeReturn(originalIndex);
              return (
                <motion.div
                  key={row.recordId}
                  layout="position"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="flex items-center justify-between gap-4 border-b border-border px-1 py-3"
                  style={{ height: ITEM_HEIGHT }}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted/30 text-[0.65rem] text-muted-foreground">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {formatActivitySummary(row)}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatActivityDate(row.sealedAt)}</p>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 text-sm font-medium tabular-nums ${
                      ret.positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {ret.formatted}
                  </span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}