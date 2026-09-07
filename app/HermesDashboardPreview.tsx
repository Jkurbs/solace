'use client';

import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';

import { useFitSlots } from './use-fit-slots';

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
  key?: string;
  kind: DecisionKind;
  live?: boolean;
  meta: string;
  title: string;
};

const ITEM_HEIGHT = 56;
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
  const { ref: listRef, slots } = useFitSlots(ITEM_HEIGHT);
  const stream = useMemo(
    () => decisions.filter((row) => row.rowClass !== 'system').map(toStreamRow),
    [decisions],
  );
  const historySlots = waiting ? Math.max(0, slots - 1) : slots;
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (reduceMotion || stream.length < 2 || historySlots < 1) {
      return undefined;
    }

    const cycle = window.setInterval(() => {
      setOffset((current) => current + 1);
    }, CYCLE_MS);

    return () => window.clearInterval(cycle);
  }, [historySlots, reduceMotion, stream.length]);

  const waitingRow: StreamRow | null = waiting
    ? {
        id: 'live-waiting',
        kind: 'wait',
        live: true,
        meta: copy.liveWaitingDetail,
        title: copy.liveWaiting,
      }
    : null;
  const historyRows =
    stream.length === 0 || historySlots < 1
      ? []
      : Array.from({ length: historySlots }, (_, index) => {
          const row = stream[(offset + index) % stream.length];
          return { ...row, key: `${row.id}:${offset + index}` };
        });
  const rows = waitingRow ? [waitingRow, ...historyRows] : historyRows;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <p className="mb-3 text-sm text-white/45">Each line is written down before anyone knows if it was right.</p>

      <div ref={listRef} className="relative min-h-0 flex-1 overflow-hidden">
        <AnimatePresence initial={false} mode="popLayout">
          {rows.map((row) => (
            <motion.div
              key={row.key ?? row.id}
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
