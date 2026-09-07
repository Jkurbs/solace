'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

import { ShimmerLink } from '@/components/shimmer-link';
import SiteFooter from '@/components/site-footer';
import SiteHeader from '@/components/site-header';
import { gloryaEvaluatedNeeds } from '@/features/glorya/evaluated-needs';
import { useHasGuestSimSession } from '@/features/hermes-dashboard/sim-session-client';
import type { HermesLedgerRow } from '@/features/hermes-ledger/store';
import { OBSERVATORY_HERMES_LEDGER_PATH } from '@/features/observatory/paths';
import { isInAppNavigationAnchor, setWebglPaused } from '@/lib/webgl-lifecycle';

import GloryaNeedField from './GloryaNeedField';
import HermesDashboardPreview from './HermesDashboardPreview';
import { HomeMetricsBanner } from './HomeMetricsBanner';
import { HomeProofSection } from './HomeProofSection';
import OracleOrbSection from './OracleOrbSection';
import type { ActivePrediction } from './oracle/active-predictions';
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

export type HermesTelemetry = {
  posture: string;
  reason?: string;
  condition?: string;
  deployedCount?: number;
  pathsCount: number;
  pathsLabel: string;
  updatedAt: string;
};

export type ChainHeadSummary = {
  rowNumber: number;
  recordId: string;
  hash: string;
  prevHash?: string;
  sealedAtLabel: string;
};

export type AnchorStatus = {
  cadence: string;
  lastAnchoredLabel?: string;
  href?: string;
};

// Helper to format relative time
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = Date.now();
  const diff = now - date.getTime();
  if (diff < 0) return '—';
  const minutes = Math.round(diff / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  return `${days}d`;
}

export default function HomeClient({
  hermesTelemetry,
  sealedDecisions,
  chainHead = null,
  anchor = null,
  recentDecisions = [],
  oraclePredictions = [],
}: {
  hermesTelemetry: HermesTelemetry | null;
  sealedDecisions: number | null;
  chainHead?: ChainHeadSummary | null;
  anchor?: AnchorStatus | null;
  recentDecisions?: HermesLedgerRow[];
  oraclePredictions?: ActivePrediction[];
}) {
  const reduceMotion = useReducedMotion();
  const heroInitial = reduceMotion ? false : 'hidden';
  const hasSimSession = useHasGuestSimSession();

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const target = e.target;
      if (!(target instanceof Element)) return;
      const link = target.closest('a[href]');
      if (!(link instanceof HTMLAnchorElement)) return;
      if (!isInAppNavigationAnchor(link)) return;
      setWebglPaused(true);
    };
    const onShow = () => setWebglPaused(false);
    const onVis = () => {
      if (document.visibilityState === 'visible') setWebglPaused(false);
    };
    document.addEventListener('click', onClick, true);
    window.addEventListener('pageshow', onShow);
    document.addEventListener('visibilitychange', onVis);
    setWebglPaused(false);
    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('pageshow', onShow);
      document.removeEventListener('visibilitychange', onVis);
      setWebglPaused(false);
    };
  }, []);

  const showRecord =
    (sealedDecisions != null && sealedDecisions > 0) || Boolean(chainHead) || Boolean(anchor);

  const lastAnchoredLabel = anchor?.lastAnchoredLabel
    ? anchor.lastAnchoredLabel
    : chainHead
      ? formatRelativeTime(chainHead.sealedAtLabel)
      : '—';

  const isVerified = Boolean(anchor?.href);

  return (
    <main className="home-research min-h-screen bg-background pt-16 text-foreground antialiased selection:bg-foreground/10">
      <SiteHeader />

      <section className="hero-research hero-particle-section relative overflow-hidden">
        <motion.div
          initial={heroInitial}
          animate="show"
          variants={stagger}
          className="hero-particle-layout relative z-10 mx-auto flex min-h-[calc(100svh-4rem)] max-w-6xl flex-col items-center justify-center px-5 py-28 md:py-36"
        >
          <div className="hero-particle-copy home-hero-copy flex w-full max-w-3xl flex-col items-center text-center">
            {/* Title */}
            <motion.h1
              variants={fade}
              className="hero-particle-title home-hero-title is-mission text-center"
            >
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

            {/* Interactive Telemetry Banner
            {showRecord && (
              <motion.div variants={fade} className="mt-12 w-full">
                <HomeMetricsBanner
                  decisionsCount={sealedDecisions ?? 0}
                  lastAnchoredLabel={lastAnchoredLabel}
                />
              </motion.div>
            )} */}
          </div>
        </motion.div>
      </section>

      {showRecord && <HomeProofSection rows={recentDecisions} sealedDecisions={sealedDecisions} />}

      <section className="home-chapter is-ink border-t border-border" aria-label="Hermes">
        <div className="home-chapter-inner">
          <div className="home-instrument">
            <div className="mb-5">
              <h2 className="text-3xl font-medium tracking-tight text-white md:text-4xl">Hermes</h2>
              <p className="mt-2 max-w-md text-base leading-relaxed text-white/55">
                Decides when to put money to work, and when to wait.
              </p>
            </div>
            <div className="flex min-h-0 flex-1 flex-col">
              <HermesDashboardPreview decisions={recentDecisions} posture={hermesTelemetry?.posture} />
            </div>
            <div className="mt-5 flex items-center justify-end border-t border-white/5 pt-4 text-xs text-white/50">
              <ShimmerLink
                href="/hermes"
                tone="ink"
                className="flex shrink-0 items-center gap-1 text-sm font-medium text-white/70 transition-colors hover:text-white"
              >
                Explore Hermes <span>→</span>
              </ShimmerLink>
            </div>
          </div>
        </div>
      </section>

      <section className="home-chapter is-ink border-t border-border" aria-label="Oracle">
        <div className="home-chapter-inner">
          <div className="home-instrument">
            <div className="mb-5">
              <h2 className="text-3xl font-medium tracking-tight text-white md:text-4xl">Oracle</h2>
              <p className="mt-2 max-w-md text-base leading-relaxed text-white/55">
                Writes a probability before an event resolves, then scores it against what happened.
              </p>
            </div>
            <div className="flex min-h-0 flex-1 flex-col">
              <OracleOrbSection predictions={oraclePredictions} />
            </div>
            <div className="mt-5 flex items-center justify-end border-t border-white/5 pt-4 text-xs text-white/50">
              <ShimmerLink
                href="/oracle"
                tone="ink"
                className="flex shrink-0 items-center gap-1 text-sm font-medium text-white/70 transition-colors hover:text-white"
              >
                Explore Oracle <span>→</span>
              </ShimmerLink>
            </div>
          </div>
        </div>
      </section>

      <section className="home-glorya" aria-label="Glorya">
        <div className="home-glorya-head">
          <p className="home-horizon-dek">
            We start with money, because that&apos;s where you can check the decisions fast.
          </p>
          <p className="home-horizon-dek">The same kind of decision, later, in other places.</p>
        </div>
        <div className="home-glorya-stage">
          <div className="home-glorya-globe" aria-hidden="true">
            <GloryaNeedField compact cycle className="home-glorya-field" needs={gloryaEvaluatedNeeds} />
          </div>
          {/* <p className="home-glorya-copy home-glorya-line">
            <Link href="/glorya">Glorya</Link>
            {' · $0 moved. Does not move money until $1M revenue.'}
          </p> */}
        </div>
      </section>

      {/* Footer */}
      <section className="border-t border-border px-5 py-24 md:py-32">
        <div className="mx-auto max-w-6xl">
          <p className="max-w-xl text-sm leading-relaxed text-muted">
            Solace is built by <span className="text-foreground">Kerby Jean</span>.
          </p>
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <Link
              href="/brief"
              className="text-muted underline decoration-transparent underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground/30"
            >
              Read the brief
            </Link>
            <Link
              href="/research"
              className="text-muted underline decoration-transparent underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground/30"
            >
              Notes
            </Link>
            <a
              href="https://github.com/Jkurbs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted underline decoration-transparent underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground/30"
            >
              GitHub
            </a>
            <a
              href="mailto:hello@solace.fyi"
              className="text-muted underline decoration-transparent underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground/30"
            >
              hello@solace.fyi
            </a>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}