'use client';

import Link from 'next/link';
import { useEffect, useState, useMemo } from 'react';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';

import Mark from './Mark';
import ThemeToggle from './ThemeToggle';
import { gateDomains } from '@/features/gates/conditions';
import type { HermesPublicPosture } from '@/features/hermes-public-reading/types';
import { OBSERVATORY_HERMES_LEDGER_PATH, OBSERVATORY_PATH } from '@/features/observatory/paths';
import { DOCS_API_URL } from '@/lib/docs';
import { isInAppNavigationAnchor, setWebglPaused } from '@/lib/webgl-lifecycle';

import { calibration } from './calibration';

const footerInstruments = [
  { name: 'Hermes', status: 'Live', href: '/hermes' },
  { name: 'Oracle', status: 'Keeping score', href: '/oracle' },
  { name: 'Simulation', status: 'In progress', href: '/gates#simulation' },
  { name: 'Glorya', status: 'Evaluating', href: '/glorya' },
] as const;

const footerContactChannels = [
  {
    label: 'Enter Hermes',
    detail: 'Simulation dashboard',
    href: '/dashboard',
    external: false,
  },
  {
    label: 'hello@solace.fyi',
    detail: 'General',
    href: 'mailto:hello@solace.fyi',
    external: false,
  },
  {
    label: 'support@solace.fyi',
    detail: 'Support',
    href: 'mailto:support@solace.fyi',
    external: false,
  },
  {
    label: 'security@solace.fyi',
    detail: 'Security',
    href: 'mailto:security@solace.fyi',
    external: false,
  },
  {
    label: 'X @solacefyi',
    detail: 'Public notes',
    href: 'https://x.com/solacefyi',
    external: true,
  },
] as const;

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
      'An independent research company building instruments for disciplined decision-making under uncertainty. Not a fund, not a product, not a trading bot.',
  },
  {
    question: 'What is Hermes?',
    answer:
      'The first instrument: a live system that reads market structure to decide when capital should move, wait, or be preserved.',
  },
  {
    question: 'Does Hermes manage customer funds?',
    answer:
      'Not yet. You can observe the public ledger and enter Hermes with simulation capital. Real capital is limited — when you ask to allocate, Solace adds you to the waitlist.',
  },
  {
    question: 'How do I enter Hermes?',
    answer:
      'Open the dashboard to run simulation capital — no application form. Watch the public ledger anytime. Real capital access is a separate waitlist when you choose to allocate.',
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

const hermesLiveVoice: Record<HermesPublicPosture, { phrase: string; tone: string }> = {
  DEPLOYED: { phrase: 'putting capital to work', tone: '#3d6b4f' },
  SELECTIVE: { phrase: 'waiting for a cleaner opening', tone: '#8a7e6b' },
  DEFENSIVE: { phrase: 'protecting capital first', tone: '#a67c52' },
  STANDING_DOWN: { phrase: 'standing down', tone: '#6b6b6b' },
  RISK_OFF: { phrase: 'paused by risk controls', tone: '#6b6b6b' },
};

function formatReadingAge(updatedAt: string) {
  const ageMs = Date.now() - new Date(updatedAt).getTime();
  if (!Number.isFinite(ageMs) || ageMs < 0) return 'just now';
  const minutes = Math.floor(ageMs / 60_000);
  return minutes < 1 ? 'just now' : minutes < 60 ? `${minutes}m ago` : `${Math.floor(minutes / 60)}h ago`;
}

function ReadingAge({ updatedAt }: { updatedAt: string }) {
  const [label, setLabel] = useState(() => formatReadingAge(updatedAt));
  useEffect(() => {
    const update = () => setLabel(formatReadingAge(updatedAt));
    update();
    const interval = window.setInterval(update, 60_000);
    return () => window.clearInterval(interval);
  }, [updatedAt]);
  return <span suppressHydrationWarning>{label}</span>;
}

/* ── Foundation: Prime Radiant lattice ── */
function PrimeRadiantLattice() {
  return (
    <div className="radiant-container" aria-hidden="true">
      <svg viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg" className="radiant-svg">
        <g className="radiant-ring radiant-ring-slow">
          <path d="M200 40L360 200L200 360L40 200Z" stroke="currentColor" strokeWidth="0.5" />
          <path d="M200 40L200 360" stroke="currentColor" strokeWidth="0.5" />
          <path d="M40 200L360 200" stroke="currentColor" strokeWidth="0.5" />
          <path d="M200 40L280 200L200 280L120 200Z" stroke="currentColor" strokeWidth="0.5" />
          <circle cx="200" cy="200" r="120" stroke="currentColor" strokeWidth="0.3" opacity="0.5" />
          <circle cx="200" cy="200" r="80" stroke="currentColor" strokeWidth="0.3" opacity="0.3" />
          <circle cx="200" cy="40" r="2" fill="currentColor" opacity="0.6" />
          <circle cx="360" cy="200" r="2" fill="currentColor" opacity="0.6" />
          <circle cx="200" cy="360" r="2" fill="currentColor" opacity="0.6" />
          <circle cx="40" cy="200" r="2" fill="currentColor" opacity="0.6" />
          <circle cx="200" cy="200" r="3" fill="currentColor" opacity="0.8" />
        </g>
        <g className="radiant-ring radiant-ring-reverse">
          <path d="M200 100L300 200L200 300L100 200Z" stroke="currentColor" strokeWidth="0.5" />
          <path d="M200 100L200 300" stroke="currentColor" strokeWidth="0.5" />
          <path d="M100 200L300 200" stroke="currentColor" strokeWidth="0.5" />
          <circle cx="200" cy="100" r="1.5" fill="currentColor" opacity="0.5" />
          <circle cx="300" cy="200" r="1.5" fill="currentColor" opacity="0.5" />
          <circle cx="200" cy="300" r="1.5" fill="currentColor" opacity="0.5" />
          <circle cx="100" cy="200" r="1.5" fill="currentColor" opacity="0.5" />
        </g>
      </svg>
    </div>
  );
}

/* ── Foundation: Holographic word reveal ── */
function HolographicReveal({ text, className }: { text: string; className?: string }) {
  const reduceMotion = useReducedMotion();
  const words = useMemo(() => text.split(' '), [text]);

  if (reduceMotion) {
    return <h1 className={className}>{text}</h1>;
  }

  return (
    <h1 className={className} aria-label={text}>
      {words.map((word, i) => (
        <span key={i} className="inline-block overflow-hidden mr-[0.3em]">
          <motion.span
            className="inline-block radiant-text"
            initial={{ opacity: 0, y: '110%', filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 1.2, ease: easeOut, delay: 0.6 + i * 0.08 }}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </h1>
  );
}

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

function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header className="site-header-research">
      <div className={`site-header-inner-research ${homeShell} px-5 md:px-0`}>
        <Link href="/" className="site-wordmark-research" aria-label="Solace home">
          <Mark size={18} className="site-mark" />
          Solace
        </Link>

        <nav className="site-nav-research" aria-label="Primary navigation">
          <Link href="/brief">Brief</Link>
          <Link href="/research">Research</Link>
          <Link href={OBSERVATORY_PATH}>Observatory</Link>
          <Link href="/hermes">Instruments</Link>
        </nav>

        <div className="site-actions-research">
          <ThemeToggle />
          <button
            type="button"
            className={`site-menu-button${menuOpen ? ' is-open' : ''}`}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span /><span /><span />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="site-menu-panel-research"
          >
            <div className={`${homeShell} px-5 py-6 flex flex-col gap-4`}>
              <Link href="/brief" onClick={() => setMenuOpen(false)}>Brief</Link>
              <Link href="/research" onClick={() => setMenuOpen(false)}>Research</Link>
              <Link href={OBSERVATORY_PATH} onClick={() => setMenuOpen(false)}>Observatory</Link>
              <Link href="/hermes" onClick={() => setMenuOpen(false)}>Instruments</Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

export default function HomeClient({
  hermesTelemetry,
  researchItems,
}: {
  hermesTelemetry: HermesTelemetry | null;
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

  const voice = hermesTelemetry ? hermesLiveVoice[hermesTelemetry.posture] : null;

  return (
    <main className="home-research min-h-screen bg-background text-foreground antialiased selection:bg-foreground/10">
      <Header />
      {/* ── Hero ── */}
      <section className="hero-research relative overflow-hidden px-5 pt-12 pb-20 md:pt-16 md:pb-28 border-t border-border">
        <PrimeRadiantLattice />

        <motion.div
          initial={heroInitial}
          animate="show"
          variants={stagger}
          className={`relative z-10 ${homeShell}`}
        >
          <motion.p
            variants={fade}
            className="text-xs uppercase tracking-[0.25em] text-muted mb-8"
          >
            Independent research
          </motion.p>

          <HolographicReveal
            text="Instruments for decision making under uncertainty."
            className="font-serif text-[clamp(2.6rem,6vw,5rem)] font-medium leading-[0.95] tracking-tight"
          />

          <motion.p
            variants={fade}
            className="mt-8 text-lg md:text-xl text-muted leading-relaxed max-w-2xl"
          >
            Solace builds systems that read complexity and decide when capital should move and when it shouldn&apos;t.
            Hermes is the first instrument — live, sealed, and open to observe and simulate.
          </motion.p>

          <motion.div variants={fade} className="mt-10 flex flex-wrap items-center gap-3 sm:gap-4">
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
            Every decision any live instruments makes is recorded in a sealed ledger before the outcome is known.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4">
            <div className="w-8 h-px bg-border" />
            <Link
              href={OBSERVATORY_HERMES_LEDGER_PATH}
              className="home-charter-cta inline-flex items-center gap-2 rounded-full border border-foreground/20 bg-background px-5 py-2.5 text-xs font-medium uppercase tracking-[0.18em] text-foreground shadow-sm transition-colors hover:border-foreground/45 hover:bg-foreground/[0.04]"
            >
              Inspect the chain
              <span aria-hidden="true" className="text-[0.85em] opacity-60">
                →
              </span>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ── Instruments ── */}
      <section className="px-5 py-20 md:py-28 border-t border-border">
        <div className={homeShell}>
          <h2 className="text-xs uppercase tracking-[0.2em] text-muted mb-12">Instruments</h2>

          <div className="divide-y divide-border">
            <Link href="/hermes" className="group block py-8 first:pt-0">
              <div className="flex items-baseline justify-between gap-4">
                <div>
                  <h3 className="font-serif text-2xl md:text-3xl font-medium group-hover:opacity-70 transition-opacity">
                    Hermes
                  </h3>
                  <p className="mt-2 text-muted leading-relaxed max-w-xl">
                    A live capital allocation engine that reads market structure to decide when
                    capital should move, wait, or be preserved.
                  </p>
                </div>
                <span className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400 shrink-0">
                  <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                  Live
                </span>
              </div>
              {hermesTelemetry && (
                <p className="mt-4 text-sm text-muted font-mono tabular-nums">
                  <span style={{ color: voice?.tone }}>{hermesTelemetry.posture}</span>
                  {' · '}
                  {hermesTelemetry.pathsCount} {hermesTelemetry.pathsCount === 1 ? 'market' : 'markets'} watched
                  {' · '}
                  <ReadingAge updatedAt={hermesTelemetry.updatedAt} />
                </p>
              )}
            </Link>

            <Link href="/oracle" className="group block py-8">
              <div className="flex items-baseline justify-between gap-4">
                <div>
                  <h3 className="font-serif text-2xl md:text-3xl font-medium group-hover:opacity-70 transition-opacity">
                    Oracle
                  </h3>
                  <p className="mt-2 text-muted leading-relaxed max-w-xl">
                    Live probability over real events, scored against what actually happened.
                  </p>
                </div>
                <span className="text-sm text-muted shrink-0">Keeping score</span>
              </div>
              <p className="mt-4 text-sm text-muted font-mono tabular-nums">
                {calibration.resolved} resolved · Brier {calibration.brier.toFixed(2)}
              </p>
            </Link>

            <Link href="/gates#simulation" className="group block py-8">
              <div className="flex items-baseline justify-between gap-4">
                <div>
                  <h3 className="font-serif text-2xl md:text-3xl font-medium group-hover:opacity-70 transition-opacity">
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

            <Link href="/glorya" className="group block py-8">
              <div className="flex items-baseline justify-between gap-4">
                <div>
                  <h3 className="font-serif text-2xl md:text-3xl font-medium group-hover:opacity-70 transition-opacity">
                    Glorya
                  </h3>
                  <p className="mt-2 text-muted leading-relaxed max-w-xl">
                    Allocating humanitarian capital only when intervention can change the outcome.
                  </p>
                </div>
                <span className="text-sm text-muted shrink-0">Evaluating</span>
              </div>
              <p className="mt-4 text-sm text-muted font-mono tabular-nums">
                Waiting on $1M revenue gate · no allocations yet
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

      {/* ── Footer ── */}
      <footer className="home-research-footer border-t border-border px-5 pt-14 pb-10 md:pt-20 md:pb-12">
        <div className="home-research-footer-inner mx-auto max-w-5xl">
          <div className="home-research-footer-grid">
            <div className="home-research-footer-brand">
              <p className="solace-wordmark text-xl">
                <Mark size={20} className="site-mark" />
                Solace
              </p>
              <p className="mt-4 text-sm text-muted leading-relaxed max-w-xs">
                Independent research company building instruments for decision making under uncertainty.
                Kept only when they survive contact with the world.
              </p>
              <p className="mt-6 text-xs text-muted font-mono tracking-wider uppercase">
                Era I · The First Instrument · 2026
              </p>
              <p className="mt-2 text-xs text-muted">
                Built by{' '}
                <Link href="/brief#author" className="underline underline-offset-4 decoration-foreground/20 hover:decoration-foreground/50 hover:text-foreground transition-colors">
                  Kerby Jean
                </Link>
              </p>
            </div>

            <div>
              <p className="home-research-footer-heading">Research</p>
              <ul className="home-research-footer-list">
                <li><Link href="/brief">Technical brief</Link></li>
                <li><Link href="/research">Research notes</Link></li>
                <li><Link href="/news">News</Link></li>
                <li><Link href={OBSERVATORY_PATH}>Observatory</Link></li>
                <li><Link href={OBSERVATORY_HERMES_LEDGER_PATH}>Decision ledger</Link></li>
                <li><Link href="/gates">Gate conditions</Link></li>
                <li><a href={DOCS_API_URL}>Market API</a></li>
              </ul>
            </div>

            <div>
              <p className="home-research-footer-heading">Instruments</p>
              <ul className="home-research-footer-list home-research-footer-instruments">
                {footerInstruments.map((instrument) => (
                  <li key={instrument.name}>
                    <Link href={instrument.href}>{instrument.name}</Link>
                    <span className="home-research-footer-status">{instrument.status}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="home-research-footer-heading">Contact</p>
              <ul className="home-research-footer-list home-research-footer-contact">
                {footerContactChannels.map((channel) => (
                  <li key={channel.href}>
                    <span className="home-research-footer-channel-detail">{channel.detail}</span>
                    {channel.external ? (
                      <a href={channel.href} target="_blank" rel="noreferrer">
                        {channel.label}
                      </a>
                    ) : channel.href.startsWith('mailto:') ? (
                      <a href={channel.href}>{channel.label}</a>
                    ) : (
                      <Link href={channel.href}>{channel.label}</Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="home-research-footer-bottom">
            <p className="text-xs text-muted">© 2026 Solace. All rights reserved.</p>
            <div className="home-research-footer-legal">
              <Link href="/terms">Terms</Link>
              <Link href="/privacy">Privacy</Link>
              <a href="mailto:privacy@solace.fyi">privacy@solace.fyi</a>
              <a href="mailto:legal@solace.fyi">legal@solace.fyi</a>
              <span className="home-research-footer-motto">Domains are earned</span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
