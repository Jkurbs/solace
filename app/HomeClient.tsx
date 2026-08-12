'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

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

/** Latest sealed ledger row — the hero artifact. Wire from the ledger feed. */
export type ChainHeadSummary = {
  rowNumber: number;
  recordId: string;
  /** Full or shortened hash; displayed as-is. */
  hash: string;
  prevHash?: string;
  /** Pre-formatted, e.g. "Aug 8, 2026, 12:50 AM EDT". */
  sealedAtLabel: string;
};

/** External anchor status. */
export type AnchorStatus = {
  cadence: string;
  lastAnchoredLabel?: string;
  href?: string;
};

/** Typewriter domains: plain English outcomes for capital, belief, and aid. */
const TYPEWRITER_DOMAINS = ['capital', 'belief', 'aid', 'risk'] as const;
const TYPE_CHAR_MS = 95;      // per-character speed, typing and deleting
const TYPE_HOLD_MS = 1500;    // pause with the full word before deleting
const TYPE_EMPTY_MS = 350;    // pause on empty before the next word

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
  chainHead = null,
  anchor = null,
}: {
  hermesTelemetry: HermesTelemetry | null;
  instruments: HomeInstrumentSnapshot;
  researchItems: ResearchItem[];
  chainHead?: ChainHeadSummary | null;
  anchor?: AnchorStatus | null;
}) {
  const reduceMotion = useReducedMotion();
  const heroInitial = reduceMotion ? false : 'hidden';

  /** Typewriter: type word → hold → delete → next word. */
  const [typedWord, setTypedWord] = useState(reduceMotion ? TYPEWRITER_DOMAINS[0] : '');
  useEffect(() => {
    if (reduceMotion) return;
    let wordIndex = 0;
    let charCount = 0;
    let deleting = false;
    let timeoutId: number;
    const tick = () => {
      const word = TYPEWRITER_DOMAINS[wordIndex];
      let delay = TYPE_CHAR_MS;
      if (!deleting) {
        charCount += 1;
        if (charCount === word.length) {
          deleting = true;
          delay = TYPE_HOLD_MS;
        }
      } else {
        charCount -= 1;
        if (charCount === 0) {
          deleting = false;
          wordIndex = (wordIndex + 1) % TYPEWRITER_DOMAINS.length;
          delay = TYPE_EMPTY_MS;
        }
      }
      setTypedWord(TYPEWRITER_DOMAINS[wordIndex].slice(0, charCount));
      timeoutId = window.setTimeout(tick, delay);
    };
    timeoutId = window.setTimeout(tick, TYPE_EMPTY_MS);
    return () => window.clearTimeout(timeoutId);
  }, [reduceMotion]);

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

  const hermes = instruments.hermes;
  const showRecordCard = hermes.sealedDecisions != null && hermes.sealedDecisions > 0;

  return (
    <main className="home-research min-h-screen bg-background pt-16 text-foreground antialiased selection:bg-foreground/10">
      <SiteHeader />

      {/* ── 1 · Hero: mission headline ── */}
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
              Software Instruments for High Uncertainty
            </motion.p>

            <motion.h1
              variants={fade}
              className="hero-particle-title text-5xl md:text-7xl lg:text-8xl leading-[1.05] tracking-tight"
            >
              Instruments for decisions when you can't predict the future.
            </motion.h1>

            <motion.div variants={fade} className="hero-particle-ctas">
              <Link href="/brief" className="hero-cta hero-cta-primary hero-cta-on-void">
                Read the Brief
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* ── 2 · The Live Record Card (The X-Ray) ── */}
      <section className="px-5 pt-14 pb-16 md:pt-20 md:pb-24">
        <motion.div
          initial={heroInitial}
          animate="show"
          variants={stagger}
          className="mx-auto max-w-6xl"
        >
          {/* Typewriter bridge label */}
          <motion.p
            variants={fade}
            className="font-serif text-2xl md:text-3xl leading-snug"
            aria-label="Solace builds instruments for decisions about capital, belief, and aid."
          >
            <span aria-hidden="true">
              Solace builds software instruments for decisions about{' '}
              <span className="inline-inline-flex items-baseline text-left">
                <span>{typedWord}</span>
                <motion.span
                  animate={{ opacity: [1, 1, 0, 0] }}
                  transition={{ duration: 1.06, repeat: Infinity, times: [0, 0.5, 0.5, 1], ease: 'linear' }}
                  className="font-light ml-0.5 inline-block"
                >
                  _
                </motion.span>
              </span>
            </span>
          </motion.p>

          {/* The Live Telemetry Record Card */}
          {showRecordCard && (
            <motion.div variants={fade} className="mt-10 md:mt-14">
              <div className="inline-block w-full max-w-full rounded-2xl border border-foreground/15 px-6 py-5 md:px-8 md:py-6 bg-background/60 backdrop-blur-md">
                
                {/* 3-Second Visual Live State Readout */}
                <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4 pb-6 border-b border-foreground/10">
                  <div>
                    <p className="text-[0.65rem] uppercase tracking-[0.18em] text-muted">What Solace Sees</p>
                    <p className="font-mono text-sm font-medium mt-1">
                      {hermesTelemetry?.condition ?? 'High Market Volatility'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.65rem] uppercase tracking-[0.18em] text-muted">What Solace Decides</p>
                    <p className="font-mono text-sm font-medium mt-1 text-emerald-500 dark:text-emerald-400">
                      Posture: {hermesTelemetry?.posture ?? 'STAND DOWN (0% Exposure)'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.65rem] uppercase tracking-[0.18em] text-muted">Why</p>
                    <p className="font-mono text-xs text-muted mt-1 leading-normal">
                      {hermesTelemetry?.reason ?? '"Risk exceeds safe parameter limits. Sitting in cash."'}
                    </p>
                  </div>
                </div>

                {/* Ledger Verification Counters */}
                <div className="flex flex-wrap items-end gap-x-10 gap-y-5">
                  <div>
                    <p className="font-mono text-4xl md:text-5xl tabular-nums tracking-tight leading-none">
                      {hermes.sealedDecisions!.toLocaleString('en-US')}
                    </p>
                    <p className="mt-2 text-[0.65rem] uppercase tracking-[0.18em] text-muted">
                      Decisions Sealed Before Outcome
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-sm tabular-nums leading-none">
                      {chainHead ? chainHead.sealedAtLabel : 'Live'}
                    </p>
                    <p className="mt-2 text-[0.65rem] uppercase tracking-[0.18em] text-muted">
                      Latest Seal Timestamp
                    </p>
                  </div>
                  <div>
                    {anchor ? (
                      <Link
                        href={anchor.href ?? '/anchor'}
                        className="font-mono text-sm leading-none underline underline-offset-4 decoration-foreground/20 hover:decoration-foreground/60 transition-all"
                      >
                        Anchored {anchor.cadence}
                      </Link>
                    ) : (
                      <p className="font-mono text-sm leading-none">Public Ledger</p>
                    )}
                    <p className="mt-2 text-[0.65rem] uppercase tracking-[0.18em] text-muted">
                      Un-editable Public Record
                    </p>
                  </div>
                </div>

                {chainHead && (
                  <p className="mt-4 font-mono text-xs text-muted tabular-nums truncate max-w-md">
                    Proof #{chainHead.rowNumber} · {chainHead.recordId} · {chainHead.hash.slice(0, 20)}…
                  </p>
                )}

                <div className="mt-6">
                  <Link
                    href={OBSERVATORY_HERMES_LEDGER_PATH}
                    className="group inline-flex items-center text-sm font-medium underline underline-offset-4 decoration-foreground/20 hover:decoration-foreground/60 transition-all"
                  >
                    [ Verify Any Decision Receipt ]
                    <span aria-hidden="true" className="ml-1.5 text-[0.85em] opacity-60 transition-transform group-hover:translate-x-0.5">
                      →
                    </span>
                  </Link>
                </div>
              </div>
            </motion.div>
          )}

          {/* Direct Caption */}
          <motion.p variants={fade} className="mt-8 md:mt-10 max-w-xl text-muted leading-relaxed text-base md:text-lg">
            Every choice is published to an un-editable public record before the result is known. 
            No bad calls can be hidden, and no good calls can be faked.
          </motion.p>

          <motion.div variants={fade} className="mt-8 flex flex-wrap gap-3">
            <Link href="/hermes" className="hero-cta hero-cta-secondary">
              Meet Hermes
            </Link>
            <Link href={OBSERVATORY_HERMES_LEDGER_PATH} className="hero-cta hero-cta-secondary">
              Inspect the Live Observatory
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* ── 3 · Instruments Section: Clear First-Principles Analogies ── */}
      <section className="home-instruments-section px-5 py-16 md:py-28 border-t border-border">
        <div className="mx-auto max-w-6xl">
          <h2 className="home-instruments-kicker text-xs uppercase tracking-[0.2em] text-muted mb-3">
            The Instruments
          </h2>
          <p className="text-sm text-muted max-w-xl mb-10 md:mb-12 leading-relaxed">
            Three specialized software instruments built for human high-stress decisions. 
            Weighted by proof, not promises or hype.
          </p>

          <InstrumentPortraits
            hermes={instruments.hermes}
            glorya={instruments.glorya}
            oracleActiveCount={instruments.oracleActiveCount}
          />
        </div>
      </section>

      {/* ── 4 · Verification: Truth & Self-Auditing ── */}
      <section className="home-charter-section px-5 py-16 md:py-24 border-t border-border">
        <div className="hero-charter mx-auto max-w-2xl">
          <div className="hero-charter-rule" aria-hidden="true" />
          <SealIcon className="hero-charter-seal w-10 h-10 md:w-11 md:h-11 text-muted mx-auto" />
          <p className="hero-charter-kicker">Verification</p>
          <p className="hero-charter-body">
            The record is checkable, not claimable.
          </p>

          <ol className="mt-8 space-y-5 text-left max-w-xl mx-auto">
            <li className="flex gap-4">
              <span className="font-mono text-xs text-muted mt-1 shrink-0 tabular-nums">01</span>
              <p className="text-sm md:text-[0.95rem] leading-relaxed text-muted">
                <span className="text-foreground font-medium">Sealed before the outcome.</span>{' '}
                Every decision is timestamped and locked before capital moves or events occur.
                Editing a single past row breaks the cryptographic chain.
              </p>
            </li>
            <li className="flex gap-4">
              <span className="font-mono text-xs text-muted mt-1 shrink-0 tabular-nums">02</span>
              <p className="text-sm md:text-[0.95rem] leading-relaxed text-muted">
                <span className="text-foreground font-medium">
                  {anchor ? `Anchored ${anchor.cadence}.` : 'Witnessed publicly.'}
                </span>{' '}
                {anchor
                  ? 'The record head is published outside our control, so history cannot be rewritten—even by us.'
                  : 'The record head is public. External anchoring keeps history permanently immutable.'}
              </p>
            </li>
            <li className="flex gap-4">
              <span className="font-mono text-xs text-muted mt-1 shrink-0 tabular-nums">03</span>
              <p className="text-sm md:text-[0.95rem] leading-relaxed text-muted">
                <span className="text-foreground font-medium">Recompute it yourself.</span>{' '}
                Verify the math directly in your browser or run the open script locally.
                No permission, account, or trust required.
              </p>
            </li>
          </ol>

          <div className="hero-charter-actions mt-10 flex flex-wrap justify-center gap-3">
            <Link
              href={OBSERVATORY_HERMES_LEDGER_PATH}
              className="hero-cta hero-cta-secondary"
            >
              Open the Observatory
              <span aria-hidden="true" className="ml-1.5 text-[0.85em] opacity-60">
                →
              </span>
            </Link>
            <Link
              href="/brief#section-07"
              className="text-sm text-muted hover:text-foreground transition-colors underline underline-offset-4 decoration-transparent hover:decoration-foreground/30 self-center"
            >
              What this proves and what it doesn't
            </Link>
          </div>
        </div>
      </section>

      {/* ── 5 · Operator: Radical Transparency ── */}
      <section className="border-t border-border px-5 py-16 md:py-24">
        <div className={homeShell}>
          <h2 className="text-xs uppercase tracking-[0.2em] text-muted mb-3">Operator</h2>
          <p className="font-serif text-2xl md:text-3xl font-medium max-w-xl leading-snug">
            Solace is built and operated by one person.
          </p>
          <div className="mt-6 max-w-2xl space-y-4 text-muted leading-relaxed">
            <p>
              A system that requires a team to operate is often too complex to audit. One person
              forces every layer to be simple enough to verify, fix, and explain in plain language.
            </p>
            <p>
              <span className="text-foreground font-medium">Kerby Jean</span> — software engineer,
              four years building internal infrastructure at Apple. The instruments are built from first
              principles to remove human bias, panic, and guesswork from high-stakes choices.
            </p>
          </div>
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <Link
              href="/brief"
              className="font-medium underline underline-offset-4 decoration-foreground/20 hover:decoration-foreground/60 transition-all"
            >
              Read the Brief
            </Link>
            <a
              href="https://github.com/Jkurbs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted hover:text-foreground transition-colors underline underline-offset-4 decoration-transparent hover:decoration-foreground/30"
            >
              GitHub
            </a>
            <a
              href="mailto:hello@solace.fyi"
              className="text-muted hover:text-foreground transition-colors underline underline-offset-4 decoration-transparent hover:decoration-foreground/30"
            >
              hello@solace.fyi
            </a>
          </div>
        </div>
      </section>

      {/* ── 6 · Research & Brief Shelf ── */}
      <section className="border-t border-border px-5 py-20 md:py-28">
        <div className={homeShell}>
          <div className="flex flex-wrap items-end justify-between gap-4 mb-12">
            <div>
              <h2 className="text-xs uppercase tracking-[0.2em] text-muted mb-3">Research & The Brief</h2>
              <p className="font-serif text-2xl md:text-3xl font-medium max-w-xl leading-snug">
                The operating manual for decisions under uncertainty. Dated and updated in public.
              </p>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <Link
                href="/research"
                className="text-muted hover:text-foreground transition-colors underline underline-offset-4 decoration-transparent hover:decoration-foreground/30"
              >
                All Notes
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
            {researchItems.slice(0, 1).map((item) => (
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

      <SiteFooter />
    </main>
  );
}