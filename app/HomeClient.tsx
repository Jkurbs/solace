'use client';

import Link from 'next/link';
import { useEffect } from 'react';
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

            <motion.div variants={fade} className="hero-particle-ctas">
              <Link href="/hermes" className="hero-cta hero-cta-primary hero-cta-on-void">
                Meet Hermes
              </Link>
            </motion.div>

            {hermes.sealedDecisions != null && hermes.sealedDecisions > 0 && (
              <motion.div variants={fade} className="hero-decision-count hero-decision-on-void">
                <Link
                  href={OBSERVATORY_HERMES_LEDGER_PATH}
                  className="hero-decision-count-link group inline-flex items-center"
                >
                  <span className="hero-decision-count-value font-mono tabular-nums">
                    {hermes.sealedDecisions.toLocaleString('en-US')}
                  </span>
                  <span className="hero-decision-count-label ml-2">
                    collective decisions sealed
                  </span>
                  <span className="ml-2 opacity-60 text-sm">
                    →
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
                <span className="block text-muted font-mono tabular-nums mt-1">
                  {anchor ? `Anchored ${anchor.cadence}` : 'Hash-chained'}
                </span>
              </dd>
            </div>
          </dl>
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

      {/* ── 5 · Operator: one person, in public, accountable by name ── */}
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

      {/* ── 6 · Research shelf: trimmed to what exists ── */}
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