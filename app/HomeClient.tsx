'use client';

import Link from 'next/link';
import { useEffect, useState, useMemo } from 'react';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';

import Mark from './Mark';
import ThemeToggle from './ThemeToggle';
import { gateDomains } from '@/features/gates/conditions';
import type { HermesPublicMarketRead } from '@/features/hermes-market/types';
import type { HermesPublicPosture } from '@/features/hermes-public-reading/types';
import { hermesBetaVersionLabel } from '@/features/hermes-version';
import { OBSERVATORY_HERMES_LEDGER_PATH, OBSERVATORY_PATH } from '@/features/observatory/paths';
import { isInAppNavigationAnchor, setWebglPaused } from '@/lib/webgl-lifecycle';
import type { PlateTint } from '@/lib/note-plate';

import { calibration } from './calibration';

const easeOut = [0.16, 1, 0.3, 1] as [number, number, number, number];

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
      'Not yet. Hermes is in controlled access. Public readings are available; customer capital is not yet connected.',
  },
];

export type LatestNote = { title: string; dek: string; label: string };
export type HeroPill = { tag: string; title: string; href: string };
export type NewsItem = { slug: string; title: string; dek: string; label: string; date: string; tint: PlateTint };

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
      <svg
        viewBox="0 0 400 400"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="radiant-svg"
      >
        {/* Outer icosahedron wireframe — sparse, mathematical */}
        <g className="radiant-ring radiant-ring-slow">
          <path d="M200 40L360 200L200 360L40 200Z" stroke="currentColor" strokeWidth="0.5" />
          <path d="M200 40L200 360" stroke="currentColor" strokeWidth="0.5" />
          <path d="M40 200L360 200" stroke="currentColor" strokeWidth="0.5" />
          <path d="M200 40L280 200L200 280L120 200Z" stroke="currentColor" strokeWidth="0.5" />
          <circle cx="200" cy="200" r="120" stroke="currentColor" strokeWidth="0.3" opacity="0.5" />
          <circle cx="200" cy="200" r="80" stroke="currentColor" strokeWidth="0.3" opacity="0.3" />
          {/* Nodes */}
          <circle cx="200" cy="40" r="2" fill="currentColor" opacity="0.6" />
          <circle cx="360" cy="200" r="2" fill="currentColor" opacity="0.6" />
          <circle cx="200" cy="360" r="2" fill="currentColor" opacity="0.6" />
          <circle cx="40" cy="200" r="2" fill="currentColor" opacity="0.6" />
          <circle cx="200" cy="200" r="3" fill="currentColor" opacity="0.8" />
        </g>
        {/* Inner counter-rotating structure */}
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
            initial={{
              opacity: 0,
              y: '110%',
              filter: 'blur(8px)',
            }}
            animate={{
              opacity: 1,
              y: 0,
              filter: 'blur(0px)',
            }}
            transition={{
              duration: 1.2,
              ease: easeOut,
              delay: 0.6 + i * 0.08,
            }}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </h1>
  );
}

function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header className="site-header-research">
      <div className="site-header-inner-research max-w-3xl mx-auto px-5 md:px-0">
        <Link href="/" className="site-wordmark-research" aria-label="Solace home">
          <Mark size={18} className="site-mark" />
          <span className="font-serif text-lg font-medium tracking-tight">Solace</span>
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
            <div className="max-w-3xl mx-auto px-5 py-6 flex flex-col gap-4">
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
  latestNote,
}: {
  hermesMarket: HermesPublicMarketRead | null;
  hermesTelemetry: HermesTelemetry | null;
  latestNote: LatestNote;
  ledgerVault: unknown;
  newsItems: NewsItem[];
  pill: HeroPill;
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

      {/* ── Hero: Foundation aesthetic ── */}
      <section className="hero-research relative overflow-hidden px-5 pt-32 pb-24 md:pt-40 md:pb-32">
        <PrimeRadiantLattice />

        <motion.div
          initial={heroInitial}
          animate="show"
          variants={stagger}
          className="relative z-10 max-w-3xl mx-auto"
        >
          <motion.p
            variants={fade}
            className="text-xs uppercase tracking-[0.25em] text-muted mb-8"
          >
            Independent research
          </motion.p>

          <HolographicReveal
            text="Instruments for decision-making under uncertainty."
            className="font-serif text-[clamp(2.8rem,6.5vw,5.5rem)] font-medium leading-[0.95] tracking-tight"
          />

          <motion.p
            variants={fade}
            className="mt-10 text-lg md:text-xl text-muted leading-relaxed max-w-2xl"
          >
            Solace builds systems that read complexity and decide when capital should move and when it shouldn't.
          </motion.p>

          <motion.div variants={fade} className="mt-12 flex items-center gap-10">
            <Link
              href="/hermes"
              className="text-sm font-medium underline underline-offset-4 decoration-foreground/20 hover:decoration-foreground/60 transition-all"
            >
              Explore Hermes
            </Link>
            <Link
              href="/brief"
              className="text-sm text-muted hover:text-foreground transition-colors"
            >
              Read the brief
            </Link>
          </motion.div>
        </motion.div>

      <motion.p variants={fade} className="mt-6 text-sm text-muted">
        Every decision is recorded in a{' '}
        <Link href={OBSERVATORY_HERMES_LEDGER_PATH} className="underline underline-offset-4 decoration-foreground/20 hover:decoration-foreground/60 transition-all">
          sealed ledger
        </Link>{' '}
        before the outcome is known.
      </motion.p>

      </section>

      {/* ── Live instruments ── */}
      <section className="border-t border-border px-5 py-20 md:py-28">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xs uppercase tracking-[0.2em] text-muted mb-12">Live instruments</h2>

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
                <span className="text-sm text-muted shrink-0">Building</span>
              </div>
              <p className="mt-4 text-sm text-muted font-mono tabular-nums">
                {simulationMetrics.met}/{simulationMetrics.total} gate conditions met
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
                $1M revenue gate · 0 allocations
              </p>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Latest research ── */}
      <section className="border-t border-border px-5 py-20 md:py-28">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xs uppercase tracking-[0.2em] text-muted mb-12">Latest from the observatory</h2>
          <article>
            <h3 className="font-serif text-3xl md:text-4xl font-medium leading-tight">
              {latestNote.title}
            </h3>
            <p className="mt-4 text-lg text-muted leading-relaxed max-w-2xl">
              {latestNote.dek}
            </p>
            <div className="mt-8 flex items-center gap-6">
              <Link
                href="/research"
                className="text-sm font-medium underline underline-offset-4 decoration-foreground/20 hover:decoration-foreground/60 transition-all"
              >
                Read the note
              </Link>
              <span className="text-sm text-muted">{latestNote.label}</span>
            </div>
          </article>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="border-t border-border px-5 py-20 md:py-28 scroll-mt-24">
        <div className="max-w-3xl mx-auto">
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
      <footer className="border-t border-border px-5 py-12 md:py-16">
        <div className="max-w-3xl mx-auto flex flex-col md:flex-row justify-between gap-12">
          <div className="max-w-xs">
            <p className="font-serif text-lg font-medium">Solace</p>
            <p className="mt-3 text-sm text-muted leading-relaxed">
              Independent research company building instruments for decision-making under uncertainty.
            </p>
            <p className="mt-6 text-xs text-muted">© 2026 Solace</p>
          </div>

          <div className="flex gap-16">
            <div>
              <p className="text-xs uppercase tracking-[0.15em] text-muted mb-4">Research</p>
              <ul className="space-y-3 text-sm">
                <li><Link href="/brief" className="text-muted hover:text-foreground transition-colors">Brief</Link></li>
                <li><Link href="/research" className="text-muted hover:text-foreground transition-colors">Notes</Link></li>
                <li><Link href={OBSERVATORY_PATH} className="text-muted hover:text-foreground transition-colors">Observatory</Link></li>
                <li>
                <Link href={OBSERVATORY_HERMES_LEDGER_PATH} className="text-muted hover:text-foreground transition-colors">
                  Decision ledger
                </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.15em] text-muted mb-4">Instruments</p>
              <ul className="space-y-3 text-sm">
                <li><Link href="/hermes" className="text-muted hover:text-foreground transition-colors">Hermes</Link></li>
                <li><Link href="/oracle" className="text-muted hover:text-foreground transition-colors">Oracle</Link></li>
                <li><Link href="/glorya" className="text-muted hover:text-foreground transition-colors">Glorya</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.15em] text-muted mb-4">Connect</p>
              <ul className="space-y-3 text-sm">
                <li><a href="https://x.com/solacefyi" target="_blank" rel="noreferrer" className="text-muted hover:text-foreground transition-colors">X @solacefyi</a></li>
                <li><a href="mailto:hello@solace.fyi" className="text-muted hover:text-foreground transition-colors">hello@solace.fyi</a></li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}