'use client';

import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';

import {
  decisionTitle,
  isStandingDownPosture,
  ledgerDecisionKind,
  waitingCopy,
  type DecisionKind,
} from '@/features/hermes-dashboard/decision-language';
import type { HermesLedgerRow } from '@/features/hermes-ledger/store';

type HermesDashboardPreviewProps = {
  decisions: HermesLedgerRow[];
  posture?: string | null;
};

type StreamRow = {
  id: string;
  kind: DecisionKind;
  live?: boolean;
  meta: string;
  title: string;
};

const ITEM_HEIGHT = 56;
const VISIBLE_COUNT = 4;
const REVEAL_MS = 280;
const CYCLE_MS = 1300;
const MOTION_S = 0.22;

function formatActivityDate(value: string) {
  const date = new Date(value);

  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    timeZone: 'America/New_York',
  });
}

function toStreamRow(row: HermesLedgerRow): StreamRow {
  const kind = ledgerDecisionKind(row);

  return {
    id: row.recordId,
    kind,
    meta: formatActivityDate(row.sealedAt),
    title: decisionTitle(kind),
  };
}

export default function HermesDashboardPreview({ decisions, posture = null }: HermesDashboardPreviewProps) {
  const reduceMotion = useReducedMotion();
  const waiting = isStandingDownPosture(posture);
  const copy = waitingCopy();
  const stream = useMemo(
    () => decisions.filter((row) => row.rowClass !== 'system').map(toStreamRow),
    [decisions],
  );
  const historySlots = waiting ? VISIBLE_COUNT - 1 : VISIBLE_COUNT;
  const [displayed, setDisplayed] = useState<StreamRow[]>([]);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const initialCount = Math.min(historySlots, stream.length);

    if (reduceMotion || initialCount === 0) {
      setDisplayed(stream.slice(0, initialCount));
      setStarted(stream.length > initialCount);
      return undefined;
    }

    setDisplayed([]);
    setStarted(false);
    let step = 0;
    const timer = window.setInterval(() => {
      step += 1;
      setDisplayed(stream.slice(0, Math.min(step, initialCount)));
      if (step >= initialCount) {
        window.clearInterval(timer);
        setStarted(true);
      }
    }, REVEAL_MS);

    return () => window.clearInterval(timer);
  }, [historySlots, reduceMotion, stream]);

  useEffect(() => {
    if (reduceMotion || !started || stream.length <= historySlots) {
      return undefined;
    }

    const cycle = window.setInterval(() => {
      setDisplayed((current) => {
        if (current.length === 0) {
          return current;
        }

        const next = [...current];
        next.shift();
        const lastId = current[current.length - 1]?.id;
        const lastIndex = stream.findIndex((row) => row.id === lastId);
        const nextIndex = (lastIndex + 1) % stream.length;
        next.push(stream[nextIndex]);
        return next;
      });
    }, CYCLE_MS);

    return () => window.clearInterval(cycle);
  }, [historySlots, reduceMotion, started, stream]);

  const waitingRow: StreamRow | null = waiting
    ? {
        id: 'live-waiting',
        kind: 'wait',
        live: true,
        meta: copy.liveWaitingDetail,
        title: copy.liveWaiting,
      }
    : null;
  const rows = waitingRow ? [waitingRow, ...displayed] : displayed;

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4">
        <p className="text-sm font-medium text-white/90">Hermes is deciding.</p>
        <p className="mt-1 text-xs leading-relaxed text-white/50">
          Each line is written down before anyone knows if it was right.
        </p>
      </div>

      <div className="relative flex-1 overflow-hidden" style={{ height: VISIBLE_COUNT * ITEM_HEIGHT }}>
        <AnimatePresence initial={false} mode="popLayout">
          {rows.map((row) => (
            <motion.div
              key={row.id}
              layout="position"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: MOTION_S, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center gap-4 border-b border-white/10 px-1 py-3"
              style={{ height: ITEM_HEIGHT }}
            >
              <div className="min-w-0">
                <p className={`text-sm font-medium text-white/90 ${row.live ? 'leading-snug' : 'truncate'}`}>
                  {row.title}
                </p>
                <p className="text-xs text-white/40">{row.meta}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
