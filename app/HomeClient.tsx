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
import HeroLattice from './HeroLattice';

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
      <SiteHeader variant="ink" />
      {/* ── Hero: The Lattice as instrument, not decoration ──
          Emotional job: settle a careful visitor on one living object that
          makes Solace legible as systems for reading complexity. */}
      <section className="hero-research hero-lattice-section relative overflow-hidden px-5 pt-14 pb-20 md:pt-20 md:pb-28 border-t border-border">
        <motion.div
          initial={heroInitial}
          animate="show"
          variants={stagger}
          className="hero-lattice-layout relative z-10 mx-auto max-w-6xl"
        >
          {/* Copy stays as one block — title and description never split by the object. */}
          <div className="hero-lattice-copy">
            <motion.p
              variants={fade}
              className="text-xs uppercase tracking-[0.25em] text-muted"
            >
              Independent research
            </motion.p>

            <motion.h1
              variants={fade}
              className="mt-5 font-serif text-[clamp(2rem,4.2vw,3.35rem)] font-medium leading-[1.02] tracking-tight text-foreground"
            >
              Instruments for decision making under uncertainty.
            </motion.h1>

            <motion.p
              variants={fade}
              className="mt-6 md:mt-8 max-w-xl text-lg md:text-xl text-muted leading-relaxed"
            >
              Solace builds instruments for disciplined decision making under uncertainty.
              Hermes, the first, allocates capital autonomously so it can compound without constant attention,
              every decision sealed before the outcome and open to inspection.
            </motion.p>

            <motion.div
              variants={fade}
              className="mt-10 flex flex-wrap items-center gap-3 sm:gap-4"
            >
              <Link
                href="/hermes"
                className="inline-flex items-center gap-2 rounded-full border border-foreground bg-foreground px-5 py-2.5 text-xs font-medium uppercase tracking-[0.18em] text-background shadow-sm transition-opacity hover:opacity-90"
              >
                Meet Hermes
                <span aria-hidden="true" className="text-[0.85em] opacity-70">
                  →
                </span>
              </Link>
              <Link
                href="/brief"
                className="inline-flex items-center gap-2 rounded-full border border-foreground/20 bg-background px-5 py-2.5 text-xs font-medium uppercase tracking-[0.18em] text-foreground shadow-sm transition-colors hover:border-foreground/45 hover:bg-foreground/[0.04]"
              >
                Read the brief
              </Link>
            </motion.div>
          </div>

          <motion.figure
            variants={fade}
            className="hero-lattice-figure"
            aria-label="The Lattice — a living structural instrument maintained by Hermes"
          >
            <HeroLattice
              posture={hermesTelemetry?.posture ?? null}
              pathsCount={hermesTelemetry?.pathsCount ?? null}
            />
            <figcaption className="sr-only">
              The Lattice. A slowly evolving map of structure. Not a performance chart.
            </figcaption>
          </motion.figure>
        </motion.div>
      </section>

      {/* ── Preamble: the founding principle ── */}
      <section className="preamble px-5 pt-20 pb-12 md:pt-28 md:pb-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: easeOut, delay: 0.2 }}
          className="max-w-2xl mx-auto text-center"
        >
          <SealIcon className="w-12 h-12 text-muted mx-auto mb-8" />
          <p className="text-xs uppercase tracking-[0.3em] text-muted mb-6">Charter</p>
          <p className="font-serif text-[clamp(1.4rem,3.2vw,2.2rem)] leading-snug text-foreground">
            Every decision any live instruments makes is recorded in a sealed ledger before the outcome is known. Each ledger can be inspected in the Observatory.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4">
            <div className="w-8 h-px bg-border" />
            <Link
              href={OBSERVATORY_HERMES_LEDGER_PATH}
              className="home-charter-cta inline-flex items-center gap-2 rounded-full border border-foreground/20 bg-background px-5 py-2.5 text-xs font-medium uppercase tracking-[0.18em] text-foreground shadow-sm transition-colors hover:border-foreground/45 hover:bg-foreground/[0.04]"
            >
              Inspect the Observatory
              <span aria-hidden="true" className="text-[0.85em] opacity-60">
                →
              </span>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ── Instruments ──
          Emotional job: each instrument has a face you can recognize — device
          portraits, not a directory list. Simulation stays a quieter line. */}
      <section className="px-5 py-20 md:py-28 border-t border-border">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-xs uppercase tracking-[0.2em] text-muted mb-10 md:mb-12">Instruments</h2>

          <InstrumentPortraits
            hermes={instruments.hermes}
            glorya={instruments.glorya}
            oracleActiveCount={instruments.oracleActiveCount}
          />

          <div className="mt-12 md:mt-14 max-w-4xl mx-auto border-t border-border">
            <Link href="/gates#simulation" className="group block py-8">
              <div className="flex items-baseline justify-between gap-4">
                <div>
                  <h3 className="font-serif text-xl md:text-2xl font-medium group-hover:opacity-70 transition-opacity">
                    Simulation
                  </h3>
                  <p className="mt-2 text-muted leading-relaxed max-w-xl">
                    Synthetic worlds. Same decision engine. Failures stay off the wire.
                  </p>
                </div>
                <span className="text-sm text-muted shrink-0">In progress</span>
              </div>
              <p className="mt-4 text-sm text-muted font-mono tabular-nums">
                Gate progress · {simulationMetrics.met} of {simulationMetrics.total} conditions
              </p>
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

      <SiteFooter variant="ink" />
    </main>
  );
}
