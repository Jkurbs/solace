'use client';

import Link from 'next/link';
import { useState } from 'react';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';

import { OBSERVATORY_HERMES_LEDGER_PATH, OBSERVATORY_PATH } from '@/features/observatory/paths';
import { DOCS_API_URL } from '@/lib/docs';

import Mark from '../Mark';
import ThemeToggle from '../ThemeToggle';
import DashboardReveal from './DashboardReveal';
import RequestAccessForm from './RequestAccessForm';

export type HermesProof = {
  posture: string | null;
  postureAge: string | null;
  sealedDecisions: number;
  openPaths: number | null;
  closedPaths: number;
  hermesLabel: string;
  liveUnrealizedPnl: number | null;
  expectancy: number | null;
  hitRateLabel: string;
  sampleSize: number;
  positive: number;
  negative: number;
  standDownRateLabel: string;
};

const easeOut = [0.16, 1, 0.3, 1] as [number, number, number, number];

const fade = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: easeOut } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.08 } },
};

const accessSteps = [
  { n: '01', title: 'Review', text: 'Every request is read. Access opens in stages.' },
  { n: '02', title: 'Profile', text: 'You set the risk bounds Hermes must respect.' },
  { n: '03', title: 'Deposit', text: 'Capital is recorded to your account when rails are ready.' },
  { n: '04', title: 'Allocation', text: 'Hermes may act only after settlement, treasury, and risk checks clear.' },
] as const;

const pnlFormatter = new Intl.NumberFormat('en-US', {
  currency: 'USD',
  maximumFractionDigits: 2,
  signDisplay: 'always',
  style: 'currency',
});

function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="hermes-paper-header">
      <div className="hermes-paper-header-inner">
        <Link href="/" className="hermes-paper-brand" aria-label="Solace home">
          <Mark size={18} className="site-mark" />
          <span>Solace</span>
        </Link>

        <nav className="hermes-paper-nav" aria-label="Primary">
          <a href="#profit">Profit</a>
          <a href="#trust">Trust</a>
          <Link href={OBSERVATORY_HERMES_LEDGER_PATH}>Ledger</Link>
        </nav>

        <div className="hermes-paper-actions">
          <ThemeToggle />
          <a href="#request-access" className="hermes-paper-btn hermes-paper-btn-primary hermes-paper-btn-sm">
            Request access
          </a>
          <button
            type="button"
            className={`site-menu-button${menuOpen ? ' is-open' : ''}`}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="hermes-paper-menu"
          >
            <a href="#profit" onClick={() => setMenuOpen(false)}>
              Profit
            </a>
            <a href="#trust" onClick={() => setMenuOpen(false)}>
              Trust
            </a>
            <Link href={OBSERVATORY_HERMES_LEDGER_PATH} onClick={() => setMenuOpen(false)}>
              Ledger
            </Link>
            <a href="#request-access" onClick={() => setMenuOpen(false)}>
              Request access
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

function TwinPillars({ proof }: { proof: HermesProof }) {
  const openLabel = proof.openPaths === null ? '—' : String(proof.openPaths);
  const livePnl =
    proof.liveUnrealizedPnl === null ? '—' : pnlFormatter.format(proof.liveUnrealizedPnl);
  const expectancy =
    proof.expectancy === null ? '—' : pnlFormatter.format(proof.expectancy);
  const liveTone =
    proof.liveUnrealizedPnl === null
      ? undefined
      : proof.liveUnrealizedPnl > 0
        ? 'is-pos'
        : proof.liveUnrealizedPnl < 0
          ? 'is-neg'
          : undefined;

  return (
    <section className="hermes-pillars" aria-label="Profit and trust">
      <div className="hermes-paper-shell">
        <p className="hermes-paper-kicker">What Hermes is for</p>
        <h2 className="hermes-paper-section-title hermes-pillars-title">Two things. Only two.</h2>
        <p className="hermes-paper-lede">
          Put capital to work when the field earns it — and leave a sealed record so you never have to take
          anyone&apos;s word for it.
        </p>

        <div className="hermes-pillars-grid">
          {/* ── Profit ── */}
          <article id="profit" className="hermes-pillar hermes-pillar-profit scroll-mt-28">
            <p className="hermes-pillar-kicker">01 · Profit</p>
            <h3>Capital that works when it should — and waits when it shouldn&apos;t.</h3>
            <p>
              Hermes allocates founder capital under uncertainty. Outcomes are public on sealed closes. The
              sample is young; the numbers are real dollars at risk, not a marketing track.
            </p>

            <div className="hermes-pillar-metrics">
              <div>
                <span>Live open PnL</span>
                <strong className={liveTone}>{livePnl}</strong>
                <em>
                  {proof.posture
                    ? `${proof.posture}${proof.postureAge ? ` · ${proof.postureAge}` : ''}`
                    : 'No fresh public reading'}
                </em>
              </div>
              <div>
                <span>Mean sealed close</span>
                <strong>{expectancy}</strong>
                <em>
                  {proof.sampleSize
                    ? `n=${proof.sampleSize} · founder capital`
                    : 'No sealed closes with PnL yet'}
                </em>
              </div>
              <div>
                <span>Directional hit rate</span>
                <strong>{proof.hitRateLabel}</strong>
                <em>
                  {proof.sampleSize
                    ? `${proof.positive} up · ${proof.negative} down`
                    : 'After directional outcomes only'}
                </em>
              </div>
              <div>
                <span>Open · closed paths</span>
                <strong>
                  {openLabel} · {proof.closedPaths}
                </strong>
                <em>Live marks · close rows on chain</em>
              </div>
            </div>

            <Link href={OBSERVATORY_HERMES_LEDGER_PATH} className="hermes-paper-btn hermes-paper-btn-secondary">
              See outcomes on the ledger
              <span aria-hidden="true">→</span>
            </Link>
          </article>

          {/* ── Trust ── */}
          <article id="trust" className="hermes-pillar hermes-pillar-trust scroll-mt-28">
            <p className="hermes-pillar-kicker">02 · Trust</p>
            <h3>Every decision sealed before the outcome is known.</h3>
            <p>
              Wins, losses, and waits get rows. The chain is hashed and public. You can recompute it yourself —
              no account, no permission. That is how Hermes earns confidence.
            </p>

            <div className="hermes-pillar-metrics">
              <div>
                <span>Sealed decisions</span>
                <strong>{proof.sealedDecisions}</strong>
                <em>On the public chain</em>
              </div>
              <div>
                <span>Standing down</span>
                <strong>{proof.standDownRateLabel}</strong>
                <em>Share of decisions that wait</em>
              </div>
              <div>
                <span>Capital at risk</span>
                <strong>Founder only</strong>
                <em>$0 customer funds · {proof.hermesLabel}</em>
              </div>
              <div>
                <span>Verifiable</span>
                <strong>By math</strong>
                <em>Hash chain · open script</em>
              </div>
            </div>

            <div className="hermes-pillar-actions">
              <Link href={OBSERVATORY_HERMES_LEDGER_PATH} className="hermes-paper-btn hermes-paper-btn-primary">
                Inspect the ledger
                <span aria-hidden="true">→</span>
              </Link>
              <Link href={OBSERVATORY_PATH} className="hermes-paper-btn hermes-paper-btn-secondary">
                Observatory
              </Link>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

export default function HermesExperience({ proof }: { proof: HermesProof }) {
  const reduceMotion = useReducedMotion();
  const heroInitial = reduceMotion ? false : 'hidden';

  return (
    <main className="hermes-paper min-h-screen bg-background text-foreground antialiased">
      <Header />

      {/* ── Hero ── */}
      <section className="hermes-paper-hero">
        <motion.div
          className="hermes-paper-shell"
          initial={heroInitial}
          animate="show"
          variants={stagger}
        >
          <motion.p variants={fade} className="hermes-paper-kicker">
            Hermes · The first instrument
          </motion.p>
          <motion.h1 variants={fade} className="hermes-paper-hero-title">
            Profit you can see. Trust you can check.
          </motion.h1>
          <motion.p variants={fade} className="hermes-paper-hero-lede">
            Hermes puts capital to work under uncertainty — and seals every decision in a public ledger before
            the outcome is known.
          </motion.p>
          <motion.p variants={fade} className="hermes-paper-status">
            Controlled access · founder capital live · customer capital not yet connected
          </motion.p>
          <motion.div variants={fade} className="hermes-paper-hero-actions">
            <a href="#profit" className="hermes-paper-btn hermes-paper-btn-primary">
              See profit
              <span aria-hidden="true">→</span>
            </a>
            <a href="#trust" className="hermes-paper-btn hermes-paper-btn-secondary">
              See trust
            </a>
            <a href="#request-access" className="hermes-paper-btn hermes-paper-btn-secondary">
              Request access
            </a>
          </motion.div>
        </motion.div>
      </section>

      <TwinPillars proof={proof} />

      {/* ── Product surface: original sticky scroll dashboard reveal ── */}
      <section className="hermes-paper-surface">
        <div className="hermes-paper-shell">
          <p className="hermes-paper-kicker">The surface</p>
          <h2 className="hermes-paper-section-title">Where profit and process meet.</h2>
          <p className="hermes-paper-lede">
            Scroll the illustrative dashboard — capital, posture, outlook, decisions — the same brief Hermes
            uses in public.
          </p>
        </div>
        <DashboardReveal />
        <div className="hermes-paper-shell">
          <p className="hermes-paper-footnote">
            Board art is illustrative. Live PnL, posture, and sealed outcomes are in the pillars and ledger
            above.
          </p>
        </div>
      </section>

      {/* ── Access ── */}
      <section className="hermes-paper-access">
        <div className="hermes-paper-shell">
          <p className="hermes-paper-kicker">Before capital moves</p>
          <h2 className="hermes-paper-section-title">Access begins with review.</h2>
          <p className="hermes-paper-lede">
            Once approved, you complete onboarding, set a risk profile, and deposit when rails are ready. Hermes
            only becomes eligible after checks clear.
          </p>
          <ol className="hermes-paper-access-steps">
            {accessSteps.map((step) => (
              <li key={step.n}>
                <span>{step.n}</span>
                <strong>{step.title}</strong>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Request form ── */}
      <section id="request-access" className="hermes-paper-form scroll-mt-28">
        <div className="hermes-paper-shell">
          <p className="hermes-paper-kicker">Request access</p>
          <h2 className="hermes-paper-section-title">Tell us who you are.</h2>
          <p className="hermes-paper-lede">
            Hermes is introduced in stages. Every request is reviewed; if selected, we reach out directly. Until
            then, profit metrics and the ledger stay public.
          </p>
          <RequestAccessForm />
        </div>
      </section>

      {/* ── Deeper (quiet) ── */}
      <section className="hermes-paper-deeper">
        <div className="hermes-paper-shell">
          <p className="hermes-paper-kicker">If you want more</p>
          <div className="hermes-paper-deeper-grid">
            <Link href="/brief" className="hermes-paper-deeper-card">
              <strong>Technical brief</strong>
              <span>How Hermes is disciplined and checked.</span>
            </Link>
            <Link href={OBSERVATORY_HERMES_LEDGER_PATH} className="hermes-paper-deeper-card">
              <strong>Decision ledger</strong>
              <span>Sealed outcomes and process, in full.</span>
            </Link>
            <Link href="/gates" className="hermes-paper-deeper-card">
              <strong>Gate conditions</strong>
              <span>What must be true before capital moves.</span>
            </Link>
            <a href={DOCS_API_URL} className="hermes-paper-deeper-card">
              <strong>Market API</strong>
              <span>Public market read for builders.</span>
            </a>
          </div>
        </div>
      </section>

      <footer className="hermes-paper-foot">
        <div className="hermes-paper-shell hermes-paper-foot-inner">
          <p>Hermes · Profit · Trust · {proof.hermesLabel}</p>
          <span className="hermes-paper-foot-links">
            <ThemeToggle />
            <Link href="/">Home</Link>
            <Link href={OBSERVATORY_HERMES_LEDGER_PATH}>Ledger</Link>
          </span>
        </div>
      </footer>
    </main>
  );
}
