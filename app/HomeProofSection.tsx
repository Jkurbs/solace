'use client';

import { useReducedMotion } from 'framer-motion';
import { useEffect, useId, useRef, useState } from 'react';

import { ShimmerLink } from '@/components/shimmer-link';
import type { HermesLedgerRow } from '@/features/hermes-ledger/store';
import { OBSERVATORY_HERMES_LEDGER_PATH } from '@/features/observatory/paths';

const DEMO_WAIT_S = 5;
const SEALED_LINE = 'Each decision is written before the outcome is known.';
const DEMO_SUFFIX = ' So the past cannot be rewritten.';
const FULL_LINE = `${SEALED_LINE}${DEMO_SUFFIX}`;
const TYPE_MS = 40;

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
  const [draft, setDraft] = useState(SEALED_LINE);
  const [liveHash, setLiveHash] = useState('');
  const [focused, setFocused] = useState(false);
  const [inView, setInView] = useState(false);
  const [userTookOver, setUserTookOver] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [demoPlaying, setDemoPlaying] = useState(false);

  const userTookOverRef = useRef(false);
  const demoCancelRef = useRef(false);
  const demoStartedRef = useRef(false);
  const waitingToType = secondsLeft === 0;

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
    if (!inView || userTookOver || demoStartedRef.current) return undefined;

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
  }, [inView, userTookOver]);

  useEffect(() => {
    if (!waitingToType || userTookOver || demoStartedRef.current) return undefined;

    demoCancelRef.current = false;
    demoStartedRef.current = true;
    setDemoPlaying(true);

    if (reduceMotion) {
      setDraft(FULL_LINE);
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
    }, TYPE_MS);

    return () => {
      window.clearInterval(type);
    };
  }, [waitingToType, userTookOver, reduceMotion]);

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

  const wet = draft !== SEALED_LINE;
  const hash = liveHash || row.rowHash || '';
  const sealedLabel = Number.isNaN(new Date(row.sealedAt).getTime())
    ? row.sealedAt
    : `${sealedAtFormatter.format(new Date(row.sealedAt))} UTC`;
  const showCaret = !focused;
  const showRestore = wet && !demoPlaying;
  const showTimer =
    !userTookOver && !demoPlaying && secondsLeft !== null && secondsLeft > 0;
  const sizerText = draft.length > FULL_LINE.length ? draft : FULL_LINE;

  function takeOver() {
    if (userTookOverRef.current) return;
    userTookOverRef.current = true;
    demoCancelRef.current = true;
    setUserTookOver(true);
    setDemoPlaying(false);
    setSecondsLeft(null);
  }

  return (
    <section ref={sectionRef} className={`home-proof${wet ? ' is-wet' : ''}`}>
      <div className="home-proof-inner">
        <p className="home-proof-dare">
          Change a word.
          {showTimer ? <span className="home-proof-timer"> Writing in {secondsLeft}s</span> : null}
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
          <p className={`home-proof-verdict${showRestore ? '' : ' is-idle'}`} aria-live="polite">
            What you typed is not on the chain. This is.
          </p>
          <div className="home-proof-actions">
            <span className={`home-proof-restore-slot${showRestore ? ' is-open' : ''}`}>
              <button
                type="button"
                className="home-proof-restore"
                tabIndex={showRestore ? 0 : -1}
                aria-hidden={!showRestore}
                onClick={() => {
                  takeOver();
                  setDraft(SEALED_LINE);
                }}
              >
                Restore
              </button>
            </span>
            <ShimmerLink href={OBSERVATORY_HERMES_LEDGER_PATH} className="home-proof-link" tone="ink">
              Open the public record <span aria-hidden="true">→</span>
            </ShimmerLink>
          </div>
        </div>
      </div>
    </section>
  );
}
