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

const capabilities = [
  {
    n: '01',
    title: 'Reads structure',
    text: 'Hermes compresses liquidity, timing, and regime into one operating read — before capital moves.',
    detail: 'Posture and market condition, not a trade tip feed.',
  },
  {
    n: '02',
    title: 'Waits on purpose',
    text: 'Standing down is first-class. Waiting is competence when the field does not earn deployment.',
    detail: 'No pressure to always be in a path.',
  },
  {
    n: '03',
    title: 'Seals first',
    text: 'Every decision gets a public row before the outcome is known. Wins, losses, and waits alike.',
    detail: 'Checkable math — not screenshots after the fact.',
  },
  {
    n: '04',
    title: 'Protects capital',
    text: 'Risk is layered: posture, sizing, drawdown guards, kill switches. Money movement stays separate from signal.',
    detail: 'Customer capital is not yet connected.',
  },
] as const;

const accessSteps = [
  { n: '01', title: 'Review', text: 'Every request is read. Access opens in stages.' },
  { n: '02', title: 'Profile', text: 'You set the risk bounds Hermes must respect.' },
  { n: '03', title: 'Deposit', text: 'Capital is recorded to your account when rails are ready.' },
  { n: '04', title: 'Allocation', text: 'Hermes may act only after settlement, treasury, and risk checks clear.' },
] as const;

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
          <Link href={OBSERVATORY_HERMES_LEDGER_PATH}>Ledger</Link>
          <Link href="/brief">Brief</Link>
          <a href={DOCS_API_URL}>Market API</a>
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
            <Link href={OBSERVATORY_HERMES_LEDGER_PATH} onClick={() => setMenuOpen(false)}>
              Ledger
            </Link>
            <Link href="/brief" onClick={() => setMenuOpen(false)}>
              Brief
            </Link>
            <a href={DOCS_API_URL} onClick={() => setMenuOpen(false)}>
              Market API
            </a>
            <a href="#request-access" onClick={() => setMenuOpen(false)}>
              Request access
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

function ProofStrip({ proof }: { proof: HermesProof }) {
  const openLabel = proof.openPaths === null ? '—' : String(proof.openPaths);

  return (
    <section className="hermes-paper-proof" aria-label="Public proof">
      <div className="hermes-paper-shell">
        <p className="hermes-paper-kicker">Built to be checked</p>
        <h2 className="hermes-paper-section-title">Live facts you can check.</h2>
        <p className="hermes-paper-lede">
          What is public today — not a pitch deck. Founder capital only; the sample is young and labeled that way.
        </p>

        <div className="hermes-paper-proof-grid">
          <div className="hermes-paper-proof-cell">
            <span>Live posture</span>
            <strong>{proof.posture ?? '—'}</strong>
            <em>{proof.posture ? proof.postureAge ?? 'Public reading' : 'No fresh public reading'}</em>
          </div>
          <div className="hermes-paper-proof-cell">
            <span>Sealed decisions</span>
            <strong>{proof.sealedDecisions}</strong>
            <em>On the public chain</em>
          </div>
          <div className="hermes-paper-proof-cell">
            <span>Open · closed paths</span>
            <strong>
              {openLabel} · {proof.closedPaths}
            </strong>
            <em>Live marks · close rows</em>
          </div>
          <div className="hermes-paper-proof-cell">
            <span>Capital</span>
            <strong>Founder only</strong>
            <em>$0 customer funds · {proof.hermesLabel}</em>
          </div>
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
            Capital that waits until the signal earns it.
          </motion.h1>
          <motion.p variants={fade} className="hermes-paper-hero-lede">
            A live instrument for allocation under uncertainty. Hermes reads liquidity, timing, and regime —
            standing down until deployment is earned.
          </motion.p>
          <motion.p variants={fade} className="hermes-paper-status">
            Controlled access · founder capital live · customer capital not yet connected
          </motion.p>
          <motion.div variants={fade} className="hermes-paper-hero-actions">
            <a href="#request-access" className="hermes-paper-btn hermes-paper-btn-primary">
              Request access
              <span aria-hidden="true">→</span>
            </a>
            <Link href={OBSERVATORY_HERMES_LEDGER_PATH} className="hermes-paper-btn hermes-paper-btn-secondary">
              Inspect the ledger
            </Link>
          </motion.div>
        </motion.div>
      </section>

      <ProofStrip proof={proof} />

      {/* ── Product surface: original sticky scroll dashboard reveal ── */}
      <section className="hermes-paper-surface">
        <div className="hermes-paper-shell">
          <p className="hermes-paper-kicker">One surface</p>
          <h2 className="hermes-paper-section-title">Posture, capital, and why it waits or acts.</h2>
          <p className="hermes-paper-lede">
            Scroll through the same public-safe brief surface — capital, posture, outlook, and decisions —
            without opening a private terminal.
          </p>
        </div>
        <DashboardReveal />
        <div className="hermes-paper-shell">
          <p className="hermes-paper-footnote">
            Illustrative board art for orientation. Live posture and sealed decisions are on the public ledger
            and proof strip above.
          </p>
        </div>
      </section>

      {/* ── Capabilities 01–04 ── */}
      <section className="hermes-paper-capabilities">
        <div className="hermes-paper-shell">
          <p className="hermes-paper-kicker">How Hermes works</p>
          <h2 className="hermes-paper-section-title">Four disciplines. One instrument.</h2>

          <div className="hermes-paper-cap-list">
            {capabilities.map((item) => (
              <article key={item.n} className="hermes-paper-cap">
                <span className="hermes-paper-cap-n">{item.n}</span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                  <em>{item.detail}</em>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust / ledger ── */}
      <section className="hermes-paper-trust">
        <div className="hermes-paper-shell hermes-paper-trust-inner">
          <div>
            <p className="hermes-paper-kicker">Protected by process</p>
            <h2 className="hermes-paper-section-title">Sealed before outcome. Verifiable by math.</h2>
            <p className="hermes-paper-lede">
              The decision ledger is Hermes’s deep record inside the Observatory. Every row is hashed and chained.
              Anyone can recompute it — no account required.
            </p>
            <div className="hermes-paper-hero-actions">
              <Link href={OBSERVATORY_HERMES_LEDGER_PATH} className="hermes-paper-btn hermes-paper-btn-primary">
                Open the ledger
                <span aria-hidden="true">→</span>
              </Link>
              <Link href={OBSERVATORY_PATH} className="hermes-paper-btn hermes-paper-btn-secondary">
                Observatory
              </Link>
            </div>
          </div>
          <ul className="hermes-paper-trust-points">
            <li>
              <strong>Sealed first</strong>
              <span>Row exists before the outcome.</span>
            </li>
            <li>
              <strong>Everything counts</strong>
              <span>Waits and losses stay on the chain.</span>
            </li>
            <li>
              <strong>Mechanism private</strong>
              <span>Sizes and entries stay off the public sheet.</span>
            </li>
            <li>
              <strong>Young sample</strong>
              <span>A record of decisions, still early.</span>
            </li>
          </ul>
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
            then, the ledger, brief, and public readings stay open.
          </p>
          <RequestAccessForm />
        </div>
      </section>

      {/* ── Deeper ── */}
      <section className="hermes-paper-deeper">
        <div className="hermes-paper-shell">
          <p className="hermes-paper-kicker">Go deeper</p>
          <div className="hermes-paper-deeper-grid">
            <Link href="/brief" className="hermes-paper-deeper-card">
              <strong>Technical brief</strong>
              <span>Architecture, risk, verification commitments.</span>
            </Link>
            <Link href="/gates" className="hermes-paper-deeper-card">
              <strong>Gate conditions</strong>
              <span>What must be true before capital moves.</span>
            </Link>
            <Link href="/research" className="hermes-paper-deeper-card">
              <strong>Research notes</strong>
              <span>The four decisions that govern capital.</span>
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
          <p>Hermes · The first instrument · {proof.hermesLabel}</p>
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
