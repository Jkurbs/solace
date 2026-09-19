'use client';

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

import { ShimmerLink } from '@/components/shimmer-link';
import { useHasGuestSimSession } from '@/features/hermes-dashboard/sim-session-client';
import { OBSERVATORY_HERMES_LEDGER_PATH } from '@/features/observatory/paths';

import ResumeSimulationButton from './ResumeSimulationButton';

const easeOut = [0.16, 1, 0.3, 1] as [number, number, number, number];

const fade = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: easeOut } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

const DECISION_WORDS = ['financial', 'prediction', 'humanitarian'] as const;
const LONGEST_DECISION_WORD = 'humanitarian';
const TYPE_MS = 78;
const DELETE_MS = 36;
const HOLD_MS = 2400;

function TypedDecisionWord({ reduced }: { reduced: boolean }) {
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState<string>(DECISION_WORDS[0]);
  const [phase, setPhase] = useState<'typing' | 'holding' | 'deleting'>('holding');

  useEffect(() => {
    if (reduced) {
      setTyped(DECISION_WORDS[0]);
      setPhase('holding');
      return undefined;
    }

    const target = DECISION_WORDS[index];

    if (phase === 'holding') {
      const timer = window.setTimeout(() => setPhase('deleting'), HOLD_MS);
      return () => window.clearTimeout(timer);
    }

    if (phase === 'deleting') {
      if (typed.length === 0) {
        setIndex((current) => (current + 1) % DECISION_WORDS.length);
        setPhase('typing');
        return undefined;
      }

      const timer = window.setTimeout(() => setTyped((value) => value.slice(0, -1)), DELETE_MS);
      return () => window.clearTimeout(timer);
    }

    if (typed === target) {
      setPhase('holding');
      return undefined;
    }

    const timer = window.setTimeout(() => setTyped(target.slice(0, typed.length + 1)), TYPE_MS);
    return () => window.clearTimeout(timer);
  }, [index, phase, reduced, typed]);

  const incoming = phase === 'typing' && typed.length > 0 && typed !== DECISION_WORDS[index];
  const settled = incoming ? typed.slice(0, -1) : typed;
  const arriving = incoming ? typed.slice(-1) : '';

  return (
    <span className="home-hero-typed">
      <span className="home-hero-typed-sizer" aria-hidden="true">
        {LONGEST_DECISION_WORD}
      </span>
      <span className="home-hero-typed-text">
        {settled}
        {arriving ? <span className="home-hero-typed-ink">{arriving}</span> : null}
      </span>
    </span>
  );
}

export default function HomeHero() {
  const reduceMotion = useReducedMotion();
  const heroInitial = reduceMotion ? false : 'hidden';
  const hasSimSession = useHasGuestSimSession();

  return (
    <section className="hero-research hero-particle-section relative overflow-hidden">
      <motion.div
        initial={heroInitial}
        animate="show"
        variants={stagger}
        className="hero-particle-layout relative z-10 mx-auto flex min-h-[calc(100svh-4rem)] max-w-6xl flex-col items-center justify-center px-5 py-28 md:py-36"
      >
        <div className="hero-particle-copy home-hero-copy flex w-full max-w-3xl flex-col items-center text-center">
          <motion.h1 variants={fade} className="hero-particle-title home-hero-title is-mission text-center">
            Instruments that make <TypedDecisionWord reduced={Boolean(reduceMotion)} /> decisions for you.
          </motion.h1>

          <motion.p variants={fade} className="home-hero-subline mx-auto max-w-xl text-center text-lg font-medium text-foreground/90">
            Hermes is the first one. It manages money and makes market decisions on your behalf.
          </motion.p>
          <motion.p variants={fade} className="home-hero-dek mx-auto max-w-xl text-center text-muted mt-3">
            Every decision is recorded, timestamped, and publicly verified in real time.
          </motion.p>

          <motion.div variants={fade} className="hero-particle-ctas mt-8 flex justify-center gap-4">
            {hasSimSession ? (
              <>
                <ResumeSimulationButton className="hero-cta hero-cta-primary hero-cta-on-void" />
                <ShimmerLink href={OBSERVATORY_HERMES_LEDGER_PATH} className="hero-cta hero-cta-secondary hero-cta-on-void">
                  Check the live record
                </ShimmerLink>
              </>
            ) : (
              <>
                <ShimmerLink href={OBSERVATORY_HERMES_LEDGER_PATH} className="hero-cta hero-cta-primary hero-cta-on-void">
                  Check the live record
                </ShimmerLink>
                <ShimmerLink href="/hermes" className="hero-cta hero-cta-secondary hero-cta-on-void">
                  Run a simulation
                </ShimmerLink>
              </>
            )}
          </motion.div>

          <motion.p
            variants={fade}
            className="mt-5 flex items-center justify-center gap-1.5 text-center text-xs font-medium tracking-wide text-muted"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3 w-3 shrink-0"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>
              Secure Platform Identity &amp; Processing via{" "}
              <a
                href="https://stripe.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4 transition-opacity hover:opacity-70"
              >
                Stripe
              </a>{" "}
              and{" "}
              <a
                href="https://www.privy.io"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4 transition-opacity hover:opacity-70"
              >
                Privy
              </a>
            </span>
          </motion.p>
        </div>
      </motion.div>
    </section>
  );
}
