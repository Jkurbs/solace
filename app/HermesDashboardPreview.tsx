'use client';

import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';

import type { HermesLedgerRow } from '@/features/hermes-ledger/store';

type HermesDashboardPreviewProps = {
  decisions: HermesLedgerRow[];
  posture?: string | null;
};

type StreamKind = 'in' | 'out' | 'wait' | 'void' | 'note';

type StreamRow = {
  id: string;
  kind: StreamKind;
  live?: boolean;
  meta: string;
  status: string;
  statusTone: 'pos' | 'neg' | null;
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

function isStandingDown(posture: string | null | undefined) {
  const normalized = (posture ?? '').toUpperCase().replace(/[\s-]+/g, '_');

  return normalized.includes('STANDING_DOWN') || normalized === 'RISK_OFF';
}

function streamKind(row: HermesLedgerRow): StreamKind {
  if (row.eventType === 'open' || row.decision.startsWith('Opened a path')) {
    return 'in';
  }

  if (row.eventType === 'close' || /^Closed\s/i.test(row.decision)) {
    return 'out';
  }

  if (row.eventType === 'void') {
    return 'void';
  }

  const posture = row.posture.trim().toUpperCase();
  const text = `${row.decision} ${row.note} ${row.outcome ?? ''}`.toLowerCase();

  if (
    posture === 'STANDING_DOWN' ||
    posture === 'RISK_OFF' ||
    /\b(stand(?:ing)?\s*down|wait(?:ing)?|no[-\s]?trade)\b/.test(text)
  ) {
    return 'wait';
  }

  return 'note';
}

function closeStatus(row: HermesLedgerRow): { label: string; tone: 'pos' | 'neg' | null } {
  const outcome = (row.outcome ?? '').toLowerCase();

  if (outcome.includes('advanced') || outcome.includes('gained')) {
    return { label: 'Gained', tone: 'pos' };
  }

  if (outcome.includes('gave back')) {
    return { label: 'Gave back', tone: 'neg' };
  }

  if (outcome.includes('flat')) {
    return { label: 'Flat', tone: null };
  }

  if (row.pnl != null) {
    if (row.pnl > 0) {
      return { label: 'Gained', tone: 'pos' };
    }

    if (row.pnl < 0) {
      return { label: 'Gave back', tone: 'neg' };
    }

    return { label: 'Flat', tone: null };
  }

  return { label: '', tone: null };
}

function toStreamRow(row: HermesLedgerRow): StreamRow {
  const kind = streamKind(row);
  const meta = formatActivityDate(row.sealedAt);

  if (kind === 'in') {
    return { id: row.recordId, kind, meta, status: 'Open', statusTone: null, title: 'Put money to work' };
  }

  if (kind === 'out') {
    const result = closeStatus(row);

    return {
      id: row.recordId,
      kind,
      meta,
      status: result.label,
      statusTone: result.tone,
      title: 'Took money out',
    };
  }

  if (kind === 'void') {
    return { id: row.recordId, kind, meta, status: '', statusTone: null, title: 'Called off' };
  }

  if (kind === 'wait') {
    return { id: row.recordId, kind, meta, status: '', statusTone: null, title: 'Waited' };
  }

  return { id: row.recordId, kind, meta, status: '', statusTone: null, title: 'A decision was written down' };
}

export default function HermesDashboardPreview({ decisions, posture = null }: HermesDashboardPreviewProps) {
  const reduceMotion = useReducedMotion();
  const waiting = isStandingDown(posture);
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
        meta: 'Live',
        status: '',
        statusTone: null,
        title: 'Waiting',
        meta: 'Looking, not putting money in',
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
              className="flex items-center justify-between gap-4 border-b border-white/10 px-1 py-3"
              style={{ height: ITEM_HEIGHT }}
            >
              <div className="min-w-0">
                <p className={`text-sm font-medium text-white/90 ${row.live ? 'leading-snug' : 'truncate'}`}>
                  {row.title}
                </p>
                <p className="text-xs text-white/40">{row.meta}</p>
              </div>
              {row.status ? (
                <span
                  className={`shrink-0 text-sm font-medium ${
                    row.statusTone === 'pos'
                      ? 'text-emerald-400'
                      : row.statusTone === 'neg'
                        ? 'text-red-400'
                        : 'text-white/50'
                  }`}
                >
                  {row.status}
                </span>
              ) : null}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
