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

/*
 * Homepage v3 — record-first hero.
 *
 * What changed vs. the version you sent:
 *  1. Headline text unchanged ("Instruments for decisions when you can't predict the future.");
 *     the hero now contains ONLY eyebrow + headline over the particle field.
 *  2. The sealed record lives in its own section directly under the hero (not inside it):
 *     record card (sealed count, latest seal, anchor status, verify link), then the
 *     description as its caption, then the CTAs.
 *     (SpaceX structure: the event leads, the mission labels it.)
 *  3. The old small inline "N decisions sealed" line is removed (absorbed into the card).
 *
 * Wiring notes (unchanged from v2):
 *  - `chainHead`: wire from the ledger feed when ready. When null, the card shows the
 *    sealed count from instruments.hermes.sealedDecisions and omits the row line.
 *  - `anchor`: anchor is shipped — pass { cadence: 'daily', lastAnchoredLabel: '6h ago',
 *    href: '/anchor' } so the card and Verification section stop saying "ships next".
 *  - The record card is pure Tailwind (border-foreground/15, bg-background/60,
 *    backdrop-blur-md) so it sits on the particle void without new CSS. If you want it
 *    class-based like hero-cta-on-void, add:
 *      .hero-record-card { border: 1px solid rgba(255,255,255,.14);
 *        background: rgba(0,0,0,.35); backdrop-filter: blur(12px); border-radius: 1rem; }
 */

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
  const showRecordCard = hermes.sealedDecisions != null && hermes.sealedDecisions > 0;

  return (
    <main className="home-research min-h-screen bg-background pt-16 text-foreground antialiased selection:bg-foreground/10">
      <SiteHeader />

      {/* ── 1 · Hero: mission headline, record as the visual centerpiece ── */}
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
              Instrument company
            </motion.p>

            <motion.h1 variants={fade} className="hero-particle-title">
              Instruments for decisions when you can't predict the future.
            </motion.h1>
          </div>
        </motion.div>
      </section>

      {/* ── 2 · The record: directly under the hero, not inside it ── */}
      <section className="px-5 pt-14 pb-16 md:pt-20 md:pb-24">
        <motion.div
          initial={heroInitial}
          animate="show"
          variants={stagger}
          className="mx-auto max-w-6xl"
        >
          {/* The record, as the event. SpaceX structure: attempt first, mission second. */}
          {showRecordCard && (
            <motion.div variants={fade}>
              <div className="inline-block max-w-full rounded-2xl border border-foreground/15 px-6 py-5 md:px-8 md:py-6">
                <div className="flex flex-wrap items-end gap-x-10 gap-y-5">
                  <div>
                    <p className="font-mono text-4xl md:text-5xl tabular-nums tracking-tight leading-none">
                      {hermes.sealedDecisions!.toLocaleString('en-US')}
                    </p>
                    <p className="mt-2 text-[0.65rem] uppercase tracking-[0.18em] text-muted">
                      Decisions sealed
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-sm tabular-nums leading-none">
                      {chainHead ? chainHead.sealedAtLabel : 'Live'}
                    </p>
                    <p className="mt-2 text-[0.65rem] uppercase tracking-[0.18em] text-muted">
                      Latest seal
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
                      <p className="font-mono text-sm leading-none">Hash-chained</p>
                    )}
                    <p className="mt-2 text-[0.65rem] uppercase tracking-[0.18em] text-muted">
                      Record integrity
                    </p>
                  </div>
                </div>

                {chainHead && (
                  <p className="mt-4 font-mono text-xs text-muted tabular-nums truncate max-w-md">
                    #{chainHead.rowNumber} · {chainHead.recordId} · {chainHead.hash.slice(0, 20)}…
                  </p>
                )}

                <Link
                  href={OBSERVATORY_HERMES_LEDGER_PATH}
                  className="group mt-4 inline-flex items-center text-sm font-medium underline underline-offset-4 decoration-foreground/20 hover:decoration-foreground/60 transition-all"
                >
                  Verify any one of them
                  <span aria-hidden="true" className="ml-1.5 text-[0.85em] opacity-60 transition-transform group-hover:translate-x-0.5">
                    →
                  </span>
                </Link>
              </div>
            </motion.div>
          )}

          {/* Description: captions the record above it. */}
          <motion.p variants={fade} className="mt-8 md:mt-10 max-w-xl text-muted leading-relaxed text-base md:text-lg">
            Decisions are sealed before their outcome, chained to the last, and anchored
            where they cannot be edited. Hermes is the first instrument.
          </motion.p>

          <motion.div variants={fade} className="mt-8 flex flex-wrap gap-3">
            <Link href="/brief" className="hero-cta hero-cta-primary">
              Read the brief
            </Link>
            <Link href="/hermes" className="hero-cta hero-cta-secondary">
              Meet Hermes
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* ── 3 · Status strip: honest numbers, founder capital explicit ── */}
      {/* <section aria-label="Live status" className="border-t border-border px-5 py-10 md:py-12">
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
      </section> */}

      {/* ── 4 · Instruments: weighted by proof, not promise ── */}
      <section className="home-instruments-section px-5 py-16 md:py-28 border-t border-border">
        <div className="mx-auto max-w-6xl">
          <h2 className="home-instruments-kicker text-xs uppercase tracking-[0.2em] text-muted mb-3">
            Instruments
          </h2>
          <p className="text-sm text-muted max-w-xl mb-10 md:mb-12 leading-relaxed">
            Three instruments, one discipline, weighted by proof, not promise. Hermes runs
            founder capital only; outside capital opens through the gates.
          </p>

          <InstrumentPortraits
            hermes={instruments.hermes}
            glorya={instruments.glorya}
            oracleActiveCount={instruments.oracleActiveCount}
          />
        </div>
      </section>

      {/* ── 5 · Verify: the record is checkable, not claimable ── */}
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
                Every decision is hashed and timestamped before capital moves, and chained to
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
                  ? 'The chain head is published outside our control, so history cannot be rewritten, even by us.'
                  : 'The chain head is public. External anchoring ships next, so history cannot be rewritten, even by us.'}
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
              What this proves and what it doesn't
            </Link>
          </div>
        </div>
      </section>

      {/* ── 6 · Operator: one person, by design ── */}
      <section className="border-t border-border px-5 py-16 md:py-24">
        <div className={homeShell}>
          <h2 className="text-xs uppercase tracking-[0.2em] text-muted mb-3">Operator</h2>
          <p className="font-serif text-2xl md:text-3xl font-medium max-w-xl leading-snug">
            Solace is built and operated by one person.
          </p>
          <div className="mt-6 max-w-2xl space-y-4 text-muted leading-relaxed">
            <p>
              A system that requires a team to operate is too complex to audit. One person
              forces every layer to be simple enough to verify, fix, and explain. There is no
              one else to blame and no one else to trust.
            </p>
            <p>
              <span className="text-foreground font-medium">Kerby Jean</span> — software
              engineer, four years building production systems at Apple. No institutional
              trading background, and no intention of implying otherwise. The work is
              unproven, which is exactly why every decision is sealed and checkable.
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