'use client';

import Link from 'next/link';
import { useReducedMotion } from 'framer-motion';
import { useEffect, useId, useRef, useState } from 'react';

import type { HermesLedgerRow } from '@/features/hermes-ledger/store';
import { OBSERVATORY_HERMES_LEDGER_PATH } from '@/features/observatory/paths';

const DEMO_WAIT_S = 8;
const DEMO_SUFFIX = ' — after the fact';
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

function demoText(sealed: string) {
  return sealed.endsWith(DEMO_SUFFIX) ? `${sealed} now` : `${sealed}${DEMO_SUFFIX}`;
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
  const [draft, setDraft] = useState(row?.decision ?? '');
  const [liveHash, setLiveHash] = useState(row?.rowHash ?? '');
  const [focused, setFocused] = useState(false);
  const [inView, setInView] = useState(false);
  const [userTookOver, setUserTookOver] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [demoPlaying, setDemoPlaying] = useState(false);

  const userTookOverRef = useRef(false);
  const demoCancelRef = useRef(false);
  const demoStartedRef = useRef(false);

  useEffect(() => {
    setDraft(row?.decision ?? '');
    setLiveHash(row?.rowHash ?? '');
    setUserTookOver(false);
    userTookOverRef.current = false;
    demoStartedRef.current = false;
    setSecondsLeft(null);
    setDemoPlaying(false);
  }, [row?.decision, row?.rowHash, row?.recordId]);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(Boolean(entry?.isIntersecting && entry.intersectionRatio >= 0.4));
      },
      { threshold: [0, 0.4, 0.7] },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [row?.recordId]);

  useEffect(() => {
    if (!inView || userTookOver || demoPlaying || !row) {
      return undefined;
    }

    if (draft !== row.decision) {
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
  }, [inView, userTookOver, demoPlaying, row, draft]);

  useEffect(() => {
    if (secondsLeft !== 0 || userTookOver || !row || demoStartedRef.current) return undefined;

    const sealed = row.decision;
    const target = demoText(sealed);
    demoCancelRef.current = false;
    demoStartedRef.current = true;
    setDemoPlaying(true);
    setSecondsLeft(null);

    if (reduceMotion) {
      setDraft(target);
      setDemoPlaying(false);
      return undefined;
    }

    let index = 0;
    const extra = target.slice(sealed.length);
    const type = window.setInterval(() => {
      if (demoCancelRef.current || userTookOverRef.current) {
        window.clearInterval(type);
        setDemoPlaying(false);
        return;
      }

      index += 1;
      setDraft(sealed + extra.slice(0, index));

      if (index >= extra.length) {
        window.clearInterval(type);
        setDemoPlaying(false);
      }
    }, TYPE_MS);

    return () => {
      window.clearInterval(type);
    };
  }, [secondsLeft, userTookOver, row, reduceMotion]);

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

  const wet = draft !== row.decision;
  const hash = (wet ? liveHash : row.rowHash) || row.rowHash || '';
  const sealedLabel = Number.isNaN(new Date(row.sealedAt).getTime())
    ? row.sealedAt
    : `${sealedAtFormatter.format(new Date(row.sealedAt))} UTC`;
  const showCaret = !focused;
  const showTimer =
    !userTookOver && !demoPlaying && secondsLeft !== null && secondsLeft > 0;

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
          Each decision is written before the outcome is known, so it cannot be changed after the fact.
          Change a word.
          {showTimer ? <span className="home-proof-timer"> Trying a word in {secondsLeft}s</span> : null}
        </p>

        <div className="home-proof-line">
          <p className="home-proof-dry" aria-hidden="true">
            {row.decision}
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
                  setDraft(row.decision);
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
