'use client';

import Link from 'next/link';
import { useReducedMotion } from 'framer-motion';
import { useEffect, useId, useRef, useState } from 'react';

import type { HermesLedgerRow } from '@/features/hermes-ledger/store';
import { OBSERVATORY_HERMES_LEDGER_PATH } from '@/features/observatory/paths';

const DEMO_WAIT_S = 8;
const SEALED_LINE = 'Each decision is written before the outcome is known.';
const DEMO_SUFFIX = ' So the past cannot be rewritten.';
const WRITE_MS = 36;
const DEMO_TYPE_MS = 40;

const sealedAtFormatter = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  hour: 'numeric',
  hour12: false,
  minute: '2-digit',
  month: 'short',
  timeZone: 'UTC',
  year: 'numeric',
});

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Same canonical payload as features/hermes-ledger/hash.ts and verify-ledger.mjs. */
async function computeRowHash(row: {
  decision: string;
  note: string;
  posture: string;
  prevHash: string;
  recordId: string;
  sealedAt: string;
}) {
  return sha256Hex(
    JSON.stringify({
      decision: row.decision,
      note: row.note,
      posture: row.posture,
      prev_hash: row.prevHash,
      record_id: row.recordId,
      sealed_at: new Date(row.sealedAt).toISOString(),
    }),
  );
}

function pickProofRow(rows: HermesLedgerRow[]) {
  return [...rows].reverse().find((row) => Boolean(row.rowHash && row.prevHash)) ?? null;
}

export function HomeProofSection({
  rows,
  sealedDecisions = null,
}: {
  rows: HermesLedgerRow[];
  sealedDecisions?: number | null;
}) {
  const row = pickProofRow(rows);
  const fieldId = useId();
  const sectionRef = useRef<HTMLElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState<'pending' | 'writing' | 'dry'>('pending');
  const [draft, setDraft] = useState('');
  const [liveHash, setLiveHash] = useState('');
  const [focused, setFocused] = useState(false);
  const [inView, setInView] = useState(false);
  const [userTookOver, setUserTookOver] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [demoPlaying, setDemoPlaying] = useState(false);

  const userTookOverRef = useRef(false);
  const demoCancelRef = useRef(false);
  const writeStartedRef = useRef(false);
  const demoStartedRef = useRef(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry && entry.isIntersecting && entry.intersectionRatio >= 0.4) {
          setInView(true);
        }
      },
      { threshold: [0.4, 0.6, 0.8] },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [row?.recordId]);

  useEffect(() => {
    if (!inView || writeStartedRef.current) return undefined;
    writeStartedRef.current = true;

    if (reduceMotion || userTookOverRef.current) {
      setDraft(SEALED_LINE);
      setPhase('dry');
      return undefined;
    }

    setPhase('writing');
    let index = 0;
    const type = window.setInterval(() => {
      if (userTookOverRef.current) {
        window.clearInterval(type);
        setDraft(SEALED_LINE);
        setPhase('dry');
        return;
      }

      index += 1;
      setDraft(SEALED_LINE.slice(0, index));

      if (index >= SEALED_LINE.length) {
        window.clearInterval(type);
        setPhase('dry');
      }
    }, WRITE_MS);

    return () => {
      window.clearInterval(type);
    };
  }, [inView, reduceMotion]);

  useEffect(() => {
    if (phase !== 'dry' || userTookOver || demoPlaying || demoStartedRef.current) {
      return undefined;
    }

    setSecondsLeft(DEMO_WAIT_S);
    const tick = window.setInterval(() => {
      setSecondsLeft((left) => {
        if (left === null || left <= 1) {
          window.clearInterval(tick);
          return 0;
        }
        return left - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(tick);
    };
  }, [phase, userTookOver, demoPlaying]);

  useEffect(() => {
    if (secondsLeft !== 0 || userTookOver || demoStartedRef.current || phase !== 'dry') {
      return undefined;
    }

    demoCancelRef.current = false;
    demoStartedRef.current = true;
    setDemoPlaying(true);
    setSecondsLeft(null);

    if (reduceMotion) {
      setDraft(SEALED_LINE + DEMO_SUFFIX);
      setDemoPlaying(false);
      return undefined;
    }

    let index = 0;
    const type = window.setInterval(() => {
      if (demoCancelRef.current || userTookOverRef.current) {
        window.clearInterval(type);
        setDemoPlaying(false);
        return;
      }

      index += 1;
      setDraft(SEALED_LINE + DEMO_SUFFIX.slice(0, index));

      if (index >= DEMO_SUFFIX.length) {
        window.clearInterval(type);
        setDemoPlaying(false);
      }
    }, DEMO_TYPE_MS);

    return () => {
      window.clearInterval(type);
    };
  }, [secondsLeft, userTookOver, phase, reduceMotion]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [draft, focused]);

  useEffect(() => {
    if (!row?.prevHash || !row.rowHash) return undefined;

    let cancelled = false;
    void computeRowHash({
      decision: draft,
      note: row.note,
      posture: row.posture,
      prevHash: row.prevHash,
      recordId: row.recordId,
      sealedAt: row.sealedAt,
    }).then((hash) => {
      if (!cancelled) setLiveHash(hash);
    });

    return () => {
      cancelled = true;
    };
  }, [draft, row]);

  if (!row) {
    return null;
  }

  const writing = phase === 'writing';
  const wet = phase === 'dry' && draft !== SEALED_LINE;
  const hash = liveHash || row.rowHash || '';
  const sealedLabel = Number.isNaN(new Date(row.sealedAt).getTime())
    ? row.sealedAt
    : `${sealedAtFormatter.format(new Date(row.sealedAt))} UTC`;
  const showCaret = !focused;
  const showTimer = phase === 'dry' && !userTookOver && !demoPlaying && secondsLeft !== null && secondsLeft > 0;
  const sizerText = draft.length > SEALED_LINE.length ? draft : SEALED_LINE;

  function takeOver() {
    if (userTookOverRef.current) return;
    userTookOverRef.current = true;
    demoCancelRef.current = true;
    setUserTookOver(true);
    setDemoPlaying(false);
    setSecondsLeft(null);
    if (phase !== 'dry') {
      setDraft(SEALED_LINE);
      setPhase('dry');
    }
  }

  return (
    <section
      ref={sectionRef}
      className={`home-proof${wet ? ' is-wet' : ''}${writing ? ' is-writing' : ''}`}
    >
      <div className="home-proof-inner">
        <p className="home-proof-dare">
          {phase === 'dry' ? 'Change a word.' : '\u00a0'}
          {showTimer ? <span className="home-proof-timer"> Trying a word in {secondsLeft}s</span> : null}
        </p>

        <div className="home-proof-line">
          <p className="home-proof-sizer" aria-hidden="true">
            {sizerText}
          </p>
          <p className="home-proof-dry" aria-hidden="true">
            {SEALED_LINE}
          </p>
          <div className="home-proof-edit">
            {showCaret ? (
              <p className="home-proof-face" aria-hidden="true">
                {draft}
                <span className="home-proof-caret" />
              </p>
            ) : null}
            <label htmlFor={fieldId} className="sr-only">
              Sealed decision. Editing does not change the public row.
            </label>
            <textarea
              id={fieldId}
              ref={textareaRef}
              className={`home-proof-wet${focused ? ' is-focused' : ' is-idle'}`}
              value={draft}
              rows={1}
              spellCheck={false}
              onFocus={() => {
                setFocused(true);
                takeOver();
              }}
              onBlur={() => setFocused(false)}
              onChange={(event) => {
                takeOver();
                setDraft(event.target.value);
              }}
            />
          </div>
        </div>

        <p className="home-proof-why">
          If the call can be edited after the fill, it isn’t proof. It’s a story.
        </p>

        <p className="home-proof-meta">
          {row.recordId}
          <span aria-hidden="true"> · </span>
          {sealedLabel}
          {typeof sealedDecisions === 'number' && sealedDecisions > 0 ? (
            <>
              <span aria-hidden="true"> · </span>
              {sealedDecisions.toLocaleString('en-US')} sealed
            </>
          ) : null}
        </p>

        <p className="home-proof-hash" aria-label="Row hash">
          {hash}
        </p>

        <div className="home-proof-foot">
          <p className="home-proof-verdict" aria-live="polite">
            {wet ? 'What you typed is not on the chain. This is.' : ''}
          </p>
          <div className="home-proof-actions">
            {wet ? (
              <button
                type="button"
                className="home-proof-restore"
                onClick={() => {
                  takeOver();
                  setDraft(SEALED_LINE);
                }}
              >
                Restore
              </button>
            ) : null}
            <Link href={OBSERVATORY_HERMES_LEDGER_PATH} className="home-proof-link">
              Open the public record <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
