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

/** Aggregate gate honesty: the public "not yet" count across every domain. */
const gateTotals = (() => {
  const all = gateDomains.flatMap((d) => d.conditions ?? []);
  const met = all.filter((c) => c.status === 'met').length;
  const partial = all.filter((c) => c.status === 'partial').length;
  return { met, partial, total: all.length || 12 };
})();

/** The gate currently being worked — Glorya's revenue gate when present. */
const workingGate = (() => {
  const glorya = gateDomains.find((d) => d.id === 'glorya');
  const conditions = glorya?.conditions ?? [];
  const byName = conditions.find((c) =>
    /revenue/i.test(String((c as { title?: string }).title ?? (c as { id?: string }).id ?? '')),
  );
  const firstUnmet = conditions.find((c) => c.status !== 'met');
  const cond = byName ?? firstUnmet;
  if (!cond) return null;
  const c = cond as unknown as {
    title?: string;
    name?: string;
    summary?: string;
    description?: string;
    latestMark?: string;
    status?: string;
  };
  return {
    domain: 'Glorya',
    title: c.title ?? c.name ?? 'Working gate',
    summary: c.summary ?? c.description ?? null,
    latestMark: c.latestMark ?? null,
    status: c.status ?? 'not met',
  };
})();

const homepageQuestions = [
  {
    question: 'What is Hermes?',
    answer:
      'An autonomous instrument that evaluates market liquidity, timing, and regime character to make capital allocation decisions. Every decision is sealed on a cryptographically hashed public ledger before the outcome is known. Today it allocates founder capital — not customer funds.',
  },
  {
    question: 'Does Hermes manage customer funds?',
    answer:
      'No — not yet. Hermes currently allocates founder capital only, and the full record is public. Outside capital opens in stages through the waitlist, and only after the gate conditions on the public board clear.',
  },
  {
    question: 'How do I verify the record?',
    answer:
      'Every decision is hashed and sealed before its outcome, chained to the previous row, so any edit breaks the chain in a way anyone can detect. Recompute the whole ledger in the Observatory — or offline with the open verification script. No account required.',
  },
  {
    question: 'What happens if I join the waitlist?',
    answer:
      'You can open the dashboard and run simulation capital immediately, with zero financial risk. Real-capital access is offered in stages as gates clear. We store your email only to contact you about access — we never sell or share it.',
  },
  {
    question: 'What is Solace?',
    answer:
      'An independent research company building instruments for disciplined decision-making under uncertainty. Hermes is the first. It begins with capital because financial markets provide rapid, ungameable feedback for learning.',
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

/** External anchor status. Absent until the anchor job ships — by design. */
export type AnchorStatus = {
  /** e.g. "daily". */
  cadence: string;
  /** e.g. "6h ago". */
  lastAnchoredLabel?: string;
  /** Public proof: attestation repo, timestamp receipt, etc. */
  href?: string;
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

  const hermes = instruments.hermes;
  const anchorClause = anchor ? `, cryptographically anchored ${anchor.cadence}` : '';

  return (
    <main className="home-research min-h-screen bg-background pt-16 text-foreground antialiased selection:bg-foreground/10">
      <SiteHeader />

      {/* ── 1 · Hero: claim + live sealed-row artifact ── */}
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
              Hermes allocates founder capital under strict risk gates. Every decision is sealed
              before the outcome is known.
            </motion.p>

            <motion.p variants={fade} className="hero-particle-dek">
              Hermes evaluates market structure and allocates capital autonomously under strict
              risk gates, with every decision sealed before resolution.
            </motion.p>

            <motion.div variants={fade} className="hero-particle-ctas">
              <Link href="/hermes" className="hero-cta hero-cta-primary hero-cta-on-void">
                Meet Hermes
              </Link>
            </motion.div>

            {hermes.sealedDecisions != null && hermes.sealedDecisions > 0 && (
              <motion.div variants={fade} className="hero-decision-count hero-decision-on-void">
                <Link
                  href={anchor?.href ?? OBSERVATORY_HERMES_LEDGER_PATH}
                  className="hero-decision-count-link group"
                >
                  <span className="hero-decision-count-value font-mono tabular-nums">
                    {hermes.sealedDecisions.toLocaleString('en-US')}
                  </span>
                  <span className="hero-decision-count-copy">
                    <span className="hero-decision-count-label">
                      collective decisions sealed
                      {anchor && ' · cryptographically anchored'}
                    </span>
                    <span className="hero-decision-count-hint">
                      {anchor ? 'Verify the chain →' : 'Observatory ledger →'}
                    </span>
                  </span>
                </Link>
              </motion.div>
            )}
          </div>
        </motion.div>
      </section>

      {/* ── 2 · Status strip: honest numbers, founder capital explicit ── */}
      <section aria-label="Live status" className="border-t border-border px-5 py-10 md:py-12">
        <div className="mx-auto max-w-6xl">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-4">
            <div>
              <dt className="text-xs uppercase tracking-[0.18em] text-muted">Hermes</dt>
              <dd className="mt-2 text-sm leading-relaxed">
                <span className="font-medium">Live · founder capital</span>
                {hermes.sealedDecisions != null && (
                  <span className="block text-muted font-mono tabular-nums mt-1">
                    {hermes.sealedDecisions.toLocaleString('en-US')} sealed
                    {hermes.standDownRate ? ` · ${hermes.standDownRate} standing down` : ''}
                    <sup className="ml-0.5 text-muted/70">1</sup>
                  </span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.18em] text-muted">Oracle</dt>
              <dd className="mt-2 text-sm leading-relaxed">
                <span className="font-medium">Live · BTC / ETH</span>
                <span className="block text-muted font-mono tabular-nums mt-1">
                  {instruments.oracleActiveCount != null
                    ? `${instruments.oracleActiveCount} active predictions`
                    : 'calibration in progress'}
                  <sup className="ml-0.5 text-muted/70">2</sup>
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.18em] text-muted">Glorya</dt>
              <dd className="mt-2 text-sm leading-relaxed">
                <span className="font-medium">Evaluating · no live capital</span>
                <span className="block text-muted font-mono tabular-nums mt-1">
                  {instruments.glorya.evaluated} assessed · 0 sealed
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.18em] text-muted">Ledger</dt>
              <dd className="mt-2 text-sm leading-relaxed">
                <span className="font-medium">Sealed before outcome</span>
                <span className="block text-muted font-mono tabular-nums mt-1 truncate">
                  {chainHead ? `head ${chainHead.hash}` : 'hash-chained'}
                  {anchor ? ` · cryptographically anchored ${anchor.cadence}` : ''}
                  {anchor && <sup className="ml-0.5 text-muted/70">3</sup>}
                </span>
              </dd>
            </div>
          </dl>

          {/* Methodology footnotes: numbers stop being marketing and become exhibits. */}
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-1.5 text-[0.7rem] text-muted/80 font-mono">
            <Link href={OBSERVATORY_HERMES_LEDGER_PATH} className="hover:text-foreground transition-colors">
              1 definitions &amp; public contract →
            </Link>
            <Link href="/oracle" className="hover:text-foreground transition-colors">
              2 what a good Brier score is →
            </Link>
            {anchor?.href && (
              <Link
                href={anchor.href}
                className="hover:text-foreground transition-colors"
              >
                3 what anchoring prevents →
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ── 3 · Instruments: weighted by proof, not promise ── */}
      <section className="home-instruments-section px-5 py-16 md:py-28 border-t border-border">
        <div className="mx-auto max-w-6xl">
          <h2 className="home-instruments-kicker text-xs uppercase tracking-[0.2em] text-muted mb-3">
            Instruments
          </h2>
          <p className="text-sm text-muted max-w-xl mb-10 md:mb-12 leading-relaxed">
            Three instruments, one discipline — weighted by proof, not promise. Hermes runs
            founder capital only; outside capital opens through the gates.
          </p>

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

      {/* ── 4 · Verify: the record is checkable, not claimable ── */}
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
                Every decision is hashed and timestamped before capital moves — and chained to
                the previous row, so any edit breaks the chain.
              </p>
            </li>
            <li className="flex gap-4">
              <span className="font-mono text-xs text-muted mt-1 shrink-0 tabular-nums">02</span>
              <p className="text-sm md:text-[0.95rem] leading-relaxed text-muted">
                <span className="text-foreground font-medium">
                  {anchor ? `Anchored ${anchor.cadence}.` : 'Witnessed publicly.'}
                </span>{' '}
                {anchor
                  ? 'The chain head is published outside our control, so history cannot be rewritten — even by us.'
                  : 'The chain head is public. External anchoring ships next, so history cannot be rewritten — even by us.'}
              </p>
            </li>
            <li className="flex gap-4">
              <span className="font-mono text-xs text-muted mt-1 shrink-0 tabular-nums">03</span>
              <p className="text-sm md:text-[0.95rem] leading-relaxed text-muted">
                <span className="text-foreground font-medium">Recompute it yourself.</span>{' '}
                Verify the full chain in the browser, or offline with the open script. No
                account, no permission, no trust required.
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
              What this proves — and what it doesn't
            </Link>
          </div>
        </div>
      </section>

      {/* ── 5 · Gates: domains are earned — the public "not yet" board ── */}
      <section className="border-t border-border px-5 py-16 md:py-24">
        <div className={homeShell}>
          <h2 className="text-xs uppercase tracking-[0.2em] text-muted mb-3">Gates</h2>
          <p className="font-serif text-2xl md:text-3xl font-medium max-w-xl leading-snug">
            Domains are earned.{' '}
            <span className="text-muted">
              {gateTotals.met} of {gateTotals.total} expansion conditions met — and the board is
              public.
            </span>
          </p>

          {workingGate && (
            <Link href="/gates" className="group mt-10 block border border-border rounded-xl p-6 md:p-7 hover:border-foreground/25 transition-colors">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
                <p className="text-xs uppercase tracking-[0.15em] text-muted">
                  Working gate · {workingGate.domain}
                </p>
                <span className="text-xs text-muted font-mono uppercase tracking-[0.1em]">
                  {workingGate.status}
                </span>
              </div>
              <h3 className="mt-3 font-serif text-xl md:text-2xl font-medium leading-tight group-hover:opacity-70 transition-opacity">
                {workingGate.title}
              </h3>
              {workingGate.summary && (
                <p className="mt-2 text-sm text-muted leading-relaxed max-w-2xl">
                  {workingGate.summary}
                </p>
              )}
              {workingGate.latestMark && (
                <p className="mt-3 text-xs text-muted font-mono">
                  Latest mark · {workingGate.latestMark}
                </p>
              )}
              <span className="mt-4 inline-block text-sm font-medium underline underline-offset-4 decoration-foreground/20 group-hover:decoration-foreground/60 transition-all">
                See the full board
              </span>
            </Link>
          )}

          {!workingGate && (
            <div className="mt-10">
              <Link
                href="/gates"
                className="text-sm font-medium underline underline-offset-4 decoration-foreground/20 hover:decoration-foreground/60 transition-all"
              >
                See the full board
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ── 6 · Operator: one person, in public, accountable by name ── */}
      <section className="border-t border-border px-5 py-16 md:py-24">
        <div className={homeShell}>
          <h2 className="text-xs uppercase tracking-[0.2em] text-muted mb-3">Operator</h2>
          <p className="font-serif text-2xl md:text-3xl font-medium max-w-xl leading-snug">
            Built and operated by one person, in public.
          </p>
          <div className="mt-6 max-w-2xl space-y-4 text-muted leading-relaxed">
            <p>
              <span className="text-foreground font-medium">Kerby Jean</span> — software
              engineer, four years building production systems at Apple. No institutional
              trading background, and no intention of implying otherwise.
            </p>
            <p>
              Founder capital, a public ledger, and gates that must clear before Solace expands.
              The operating claim is unproven — which is exactly why everything on this site is
              checkable.
            </p>
          </div>
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <Link
              href="/brief"
              className="font-medium underline underline-offset-4 decoration-foreground/20 hover:decoration-foreground/60 transition-all"
            >
              Read the brief
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

      {/* ── 7 · Research shelf: trimmed to what exists ── */}
      <section className="border-t border-border px-5 py-20 md:py-28">
        <div className={homeShell}>
          <div className="flex flex-wrap items-end justify-between gap-4 mb-12">
            <div>
              <h2 className="text-xs uppercase tracking-[0.2em] text-muted mb-3">Research</h2>
              <p className="font-serif text-2xl md:text-3xl font-medium max-w-xl leading-snug">
                The brief and the latest notes. Dated, versioned, superseded in public.
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
            {researchItems.slice(0, 2).map((item) => (
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

      {/* ── FAQ: reordered by actual visitor questions ── */}
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