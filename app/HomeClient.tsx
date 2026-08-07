'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';

import SiteFooter from '@/components/site-footer';
import SiteHeader from '@/components/site-header';
import { gateDomains } from '@/features/gates/conditions';
import type { HermesPublicPosture } from '@/features/hermes-public-reading/types';
import { OBSERVATORY_HERMES_LEDGER_PATH } from '@/features/observatory/paths';
import { isInAppNavigationAnchor, setWebglPaused } from '@/lib/webgl-lifecycle';

import InstrumentPortraits from './InstrumentPortraits';
import HermesLiquidityFieldRender from './HermesLiquidityFieldRender';

const easeOut = [0.16, 1, 0.3, 1] as [number, number, number, number];

/** Editorial shell: a step wider than essay measure; prose stays tighter inside. */
const homeShell = 'max-w-4xl mx-auto';

const fade = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: easeOut } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

const simulationDomain = gateDomains.find((d) => d.id === 'simulation');
const simulationMetrics = (() => {
  const conditions = simulationDomain?.conditions ?? [];
  const met = conditions.filter((c) => c.status === 'met').length;
  return { met, total: conditions.length || 4 };
})();

const homepageQuestions = [
  {
    question: 'What is Solace?',
    answer:
      'An independent research company building instruments that improve decision-making under uncertainty. Hermes is the first. It begins with capital because markets give rapid feedback for learning.',
  },
  {
    question: 'What is Hermes?',
    answer:
      'An autonomous instrument designed to make better capital allocation decisions on your behalf, so your capital can compound without requiring your constant attention. Every decision is sealed on a public ledger you can check.',
  },
  {
    question: 'Does Hermes manage customer funds?',
    answer:
      'Not yet. You can observe the public ledger and enter Hermes with simulation capital. Real capital is limited. When you ask to allocate, Solace adds you to the waitlist.',
  },
  {
    question: 'How do I enter Hermes?',
    answer:
      'Open the dashboard to run simulation capital. No application form. Watch the public ledger anytime. Real capital access is a separate waitlist when you choose to allocate.',
  },
];

export type LatestNote = { title: string; dek: string; label: string };

export type FeaturedReading = {
  kind: 'News' | 'Research' | 'Brief';
  title: string;
  dek: string;
  label: string;
  href: string;
  cta: string;
};

export type ResearchItem = {
  kind: 'News' | 'Research' | 'Brief';
  title: string;
  dek: string;
  label: string;
  href: string;
  /** ISO date YYYY-MM-DD for ordering. */
  date: string;
};

export type HermesTelemetry = {
  posture: HermesPublicPosture;
  reason?: string;
  condition?: string;
  deployedCount?: number;
  pathsCount: number;
  pathsLabel: string;
  updatedAt: string;
};

export type HomeInstrumentSnapshot = {
  hermes: {
    posture: string | null;
    pathsCount: number | null;
    sealedDecisions: number | null;
    standDownRate: string | null;
    openPaths: number | null;
    openPnl: number | null;
  };
  oracleActiveCount: number | null;
  glorya: {
    evaluated: number;
    standingDown: number;
    standDownRate: number;
  };
};

/* ── Foundation: Vault seal icon ── */
function SealIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 12 12" fill="none" className={className} aria-hidden="true">
      <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1" opacity="0.6" />
      <circle cx="6" cy="6" r="2.5" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
      <circle cx="6" cy="6" r="0.8" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

export default function HomeClient({
  hermesTelemetry,
  instruments,
  researchItems,
}: {
  hermesTelemetry: HermesTelemetry | null;
  instruments: HomeInstrumentSnapshot;
  researchItems: ResearchItem[];
}) {
  const reduceMotion = useReducedMotion();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const heroInitial = reduceMotion ? false : 'hidden';

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const target = e.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest('a[href]');
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (!isInAppNavigationAnchor(anchor)) return;
      setWebglPaused(true);
    };
    const onShow = () => setWebglPaused(false);
    const onVis = () => { if (document.visibilityState === 'visible') setWebglPaused(false); };
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

  return (
    <main className="home-research min-h-screen bg-background pt-16 text-foreground antialiased selection:bg-foreground/10">
      <SiteHeader />
      {/* ── Hero: decision dust nebula ── */}
      <section className="hero-research hero-particle-section relative overflow-hidden">
        <div className="hero-particle-stage absolute inset-0 w-full h-full overflow-hidden pointer-events-none" aria-hidden="true">
          <HermesLiquidityFieldRender maxParticles={30000} />
          <div className="hero-particle-vignette absolute inset-0 pointer-events-none" />
        </div>

        <motion.div
          initial={heroInitial}
          animate="show"
          variants={stagger}
          className="hero-particle-layout relative z-10 mx-auto max-w-6xl px-5 pt-14 pb-20 md:pt-24 md:pb-28"
        >
          <div className="hero-particle-copy">
            <motion.p variants={fade} className="hero-particle-eyebrow">
              Independent research
            </motion.p>

            <motion.h1 variants={fade} className="hero-particle-title">
              Instruments for decisions when you can't predict the future.
            </motion.h1>

            <motion.p variants={fade} className="hero-particle-sub">
              Solace reads market liquidity, models event probabilities, and enforces strict safety gates before capital moves and logging every decision to an uneditable public ledger.
            </motion.p>

            <motion.p variants={fade} className="hero-particle-dek">
              Solace builds instruments for disciplined decision making under uncertainty.
              Hermes, the first, allocates capital autonomously so it can compound without constant attention,
              every decision sealed before the outcome and open to inspection.
            </motion.p>

            <motion.div variants={fade} className="hero-particle-ctas">
              <Link href="/hermes" className="hero-cta hero-cta-primary hero-cta-on-void">
                Meet Hermes
              </Link>
              <Link href="/brief" className="hero-cta hero-cta-secondary hero-cta-on-void">
                Read the brief
              </Link>
            </motion.div>

            {instruments.hermes.sealedDecisions != null &&
              instruments.hermes.sealedDecisions > 0 && (
                <motion.div variants={fade} className="hero-decision-count hero-decision-on-void">
                  <Link
                    href={OBSERVATORY_HERMES_LEDGER_PATH}
                    className="hero-decision-count-link group"
                  >
                    <span className="hero-decision-count-value font-mono tabular-nums">
                      {instruments.hermes.sealedDecisions.toLocaleString('en-US')}
                    </span>
                    <span className="hero-decision-count-copy">
                      <span className="hero-decision-count-label">
                        collective decisions sealed
                      </span>
                      <span className="hero-decision-count-hint">
                        Observatory ledger
                        <span aria-hidden="true" className="opacity-60 transition-opacity group-hover:opacity-100">
                          {' '}
                          →
                        </span>
                      </span>
                    </span>
                  </Link>
                </motion.div>
              )}
          </div>
        </motion.div>
      </section>

      {/* ── Instruments ── */}
      <section className="home-instruments-section px-5 py-16 md:py-28 border-t border-border">
        <div className="mx-auto max-w-6xl">
          <h2 className="home-instruments-kicker text-xs uppercase tracking-[0.2em] text-muted mb-10 md:mb-12">
            Instruments
          </h2>

          <InstrumentPortraits
            hermes={instruments.hermes}
            glorya={instruments.glorya}
            oracleActiveCount={instruments.oracleActiveCount}
          />

          <div className="home-simulation-unit mt-10 md:mt-14 max-w-4xl mx-auto border-t border-border">
            <Link href="/gates#simulation" className="group block py-10 md:py-8 text-center md:text-left">
              <p className="text-xs uppercase tracking-[0.18em] text-muted mb-3 md:hidden">
                In progress
              </p>
              <div className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-3 md:gap-4">
                <div className="flex flex-col items-center md:items-start">
                  <h3 className="font-serif text-[clamp(1.75rem,6vw,2rem)] md:text-2xl font-semibold md:font-medium tracking-tight group-hover:opacity-70 transition-opacity">
                    Simulation
                  </h3>
                  <p className="mt-2 text-muted leading-relaxed max-w-md md:max-w-xl text-[1rem] md:text-base">
                    Synthetic worlds. Same decision engine. Failures stay off the wire.
                  </p>
                </div>
                <span className="hidden md:inline text-sm text-muted shrink-0">In progress</span>
              </div>
              <p className="mt-4 text-sm text-muted font-mono tabular-nums">
                Gate progress · {simulationMetrics.met} of {simulationMetrics.total} conditions
              </p>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Charter ── */}
      <section className="home-charter-section px-5 py-16 md:py-24 border-t border-border">
        <div className="hero-charter mx-auto max-w-2xl">
          <div className="hero-charter-rule" aria-hidden="true" />
          <SealIcon className="hero-charter-seal w-10 h-10 md:w-11 md:h-11 text-muted mx-auto" />
          <p className="hero-charter-kicker">Charter</p>
          <p className="hero-charter-body">
            Every decision any live instrument makes is recorded in a sealed ledger before the
            outcome is known. Each ledger can be inspected in the Observatory.
          </p>
          <div className="hero-charter-actions">
            <Link
              href={OBSERVATORY_HERMES_LEDGER_PATH}
              className="hero-cta hero-cta-secondary"
            >
              Inspect the Observatory
              <span aria-hidden="true" className="ml-1.5 text-[0.85em] opacity-60">
                →
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Research shelf ── */}
      <section className="border-t border-border px-5 py-20 md:py-28">
        <div className={homeShell}>
          <div className="flex flex-wrap items-end justify-between gap-4 mb-12">
            <div>
              <h2 className="text-xs uppercase tracking-[0.2em] text-muted mb-3">Research</h2>
              <p className="font-serif text-2xl md:text-3xl font-medium max-w-xl leading-snug">
                Notes, announcements, and the technical brief.
              </p>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <Link
                href="/research"
                className="text-muted hover:text-foreground transition-colors underline underline-offset-4 decoration-transparent hover:decoration-foreground/30"
              >
                All notes
              </Link>
              <Link
                href="/news"
                className="text-muted hover:text-foreground transition-colors underline underline-offset-4 decoration-transparent hover:decoration-foreground/30"
              >
                News
              </Link>
              <Link
                href="/brief"
                className="text-muted hover:text-foreground transition-colors underline underline-offset-4 decoration-transparent hover:decoration-foreground/30"
              >
                Brief
              </Link>
            </div>
          </div>

          <div className="divide-y divide-border border-t border-border">
            {researchItems.map((item) => (
              <Link
                key={`${item.kind}-${item.href}-${item.title}`}
                href={item.href}
                className="group block py-8 first:pt-8"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
                  <p className="text-xs uppercase tracking-[0.15em] text-muted">{item.kind}</p>
                  <span className="text-xs text-muted font-mono tabular-nums">{item.label}</span>
                </div>
                <h3 className="mt-3 font-serif text-2xl md:text-3xl font-medium leading-tight group-hover:opacity-70 transition-opacity">
                  {item.title}
                </h3>
                <p className="mt-3 text-muted leading-relaxed max-w-2xl">{item.dek}</p>
                <span className="mt-5 inline-block text-sm font-medium underline underline-offset-4 decoration-foreground/20 group-hover:decoration-foreground/60 transition-all">
                  {item.kind === 'News'
                    ? 'Read the announcement'
                    : item.kind === 'Brief'
                      ? 'Read the brief'
                      : 'Read the note'}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="border-t border-border px-5 py-20 md:py-28 scroll-mt-24">
        <div className={homeShell}>
          <h2 className="text-xs uppercase tracking-[0.2em] text-muted mb-12">Questions</h2>
          <div className="divide-y divide-border">
            {homepageQuestions.map((item, i) => (
              <div key={item.question} className="py-6">
                <button
                  type="button"
                  className="w-full text-left flex items-start justify-between gap-4 group"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                >
                  <span className="font-serif text-xl md:text-2xl font-medium group-hover:opacity-70 transition-opacity">
                    {item.question}
                  </span>
                  <span className="text-muted text-2xl leading-none mt-1 font-light">
                    {openFaq === i ? '−' : '+'}
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: easeOut }}
                      className="overflow-hidden"
                    >
                      <p className="pt-4 text-muted leading-relaxed max-w-2xl">
                        {item.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}