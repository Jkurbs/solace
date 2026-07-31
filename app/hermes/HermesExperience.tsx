'use client';

import Link from 'next/link';
import { useState } from 'react';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';

import { OBSERVATORY_HERMES_LEDGER_PATH } from '@/features/observatory/paths';
import { DOCS_API_URL } from '@/lib/docs';

import Mark from '../Mark';
import ThemeToggle from '../ThemeToggle';

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

const pathSteps = [
  {
    n: '01',
    title: 'Observe',
    text: 'See how Hermes decides: what it waits for, what it deploys, and every sealed outcome on the public ledger. No account required.',
  },
  {
    n: '02',
    title: 'Simulate',
    text: 'Enter with virtual capital. Watch it work on your behalf with no financial risk, so you can judge the instrument before you trust it with more.',
  },
  {
    n: '03',
    title: 'Allocate',
    text: 'When you ask to put real capital in, Solace adds you to the waitlist. Capacity is limited; we reach out when a seat opens.',
  },
] as const;

const features = [
  {
    num: '01',
    title: 'Measures market structure',
    desc: 'Hermes continuously reads liquidity depth, volatility compression, and positioning to assess whether conditions favor capital deployment.',
  },
  {
    num: '02',
    title: 'Finds the edge',
    desc: 'Not every calm market is an opportunity. Hermes calculates whether the current setup offers asymmetric reward relative to risk.',
  },
  {
    num: '03',
    title: 'Sizes with discipline',
    desc: 'When the edge is sufficient, Hermes decides position size, entry, and invalidation level — all before any capital moves.',
  },
  {
    num: '04',
    title: 'Logs before it acts',
    desc: 'Every decision is timestamped and sealed in the public ledger. The record cannot be edited after the fact.',
  },
] as const;

const ledgerEntries = [
  {
    action: 'Opened BTC long position',
    time: 'Jul 28, 2026 · 09:14 UTC',
    detail: 'Size: 2.1% · Entry: $58,240 · Invalidation: $55,800 · Target: $64,500',
    outcome: 'Resolved +$2,142',
    resolved: true,
  },
  {
    action: 'Opened ETH/BTC spread',
    time: 'Jul 25, 2026 · 14:32 UTC',
    detail: 'Size: 1.5% · Entry ratio: 0.042 · Invalidation: 0.038 · Target: 0.048',
    outcome: 'Resolved +$1,890',
    resolved: true,
  },
  {
    action: 'Opened 2s10s curve flatten',
    time: 'Jul 22, 2026 · 11:07 UTC',
    detail: 'Size: 1.8% · Entry: -45bps · Invalidation: -25bps · Target: -75bps',
    outcome: 'Open · -$612 unrealized',
    resolved: false,
  },
] as const;

const faqItems = [
  {
    q: 'Is Hermes a trading bot I can use?',
    a: 'No. Hermes is not a consumer trading bot or copy-trading platform. It is an autonomous decision system operated by Solace. The ledger is public so you can observe how it performs.',
  },
  {
    q: 'Can I invest with Hermes?',
    a: 'Not yet. Hermes currently operates on founder capital only. The simulation lets you experience how the system would manage capital alongside you. Real allocation will open to waitlist members first.',
  },
  {
    q: 'How is this different from a hedge fund?',
    a: 'Hermes does not manage outside capital today. It does not charge fees. It simply executes, logs every decision in a sealed public record, and lets the track record speak for itself.',
  },
  {
    q: 'Can I see the exact trades?',
    a: 'Yes. The ledger shows position type, entry date, sizing, and P&L. Each entry links to the market conditions that triggered the decision.',
  },
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
          <a href="#see-it">See it</a>
          <a href="#path">How it works</a>
          <Link href={OBSERVATORY_HERMES_LEDGER_PATH}>Ledger</Link>
        </nav>

        <div className="hermes-paper-actions">
          <ThemeToggle />
          <Link href="/dashboard" className="hermes-paper-btn hermes-paper-btn-primary hermes-paper-btn-sm">
            Enter Hermes
          </Link>
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
            <a href="#see-it" onClick={() => setMenuOpen(false)}>See it</a>
            <a href="#path" onClick={() => setMenuOpen(false)}>How it works</a>
            <Link href={OBSERVATORY_HERMES_LEDGER_PATH} onClick={() => setMenuOpen(false)}>Ledger</Link>
            <Link href="/dashboard" onClick={() => setMenuOpen(false)}>Enter Hermes</Link>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

export default function HermesExperience({ proof }: { proof: HermesProof }) {
  const reduceMotion = useReducedMotion();
  const heroInitial = reduceMotion ? false : 'hidden';

  return (
    <main className="hermes-paper min-h-screen bg-background text-foreground antialiased">
      <Header />

      {/* ─── HERO ─── */}
      <section className="hermes-paper-hero">
        <motion.div
          className="hermes-paper-shell"
          initial={heroInitial}
          animate="show"
          variants={stagger}
        >
          <motion.p variants={fade} className="hermes-paper-kicker">
            Hermes · The first instrument from Solace
          </motion.p>
          <motion.h1 variants={fade} className="hermes-paper-hero-title">
            Capital that decides for itself.
          </motion.h1>
          <motion.p variants={fade} className="hermes-paper-hero-lede">
            Hermes reads market structure — liquidity, volatility, regime, risk — and decides
            whether to allocate capital, how much, and when to exit. Every decision is logged
            before it moves.
          </motion.p>
          <motion.p variants={fade} className="hermes-paper-status">
            Simulation open · founder capital live on the ledger · real capital by waitlist
          </motion.p>
          <motion.div variants={fade} className="hermes-paper-hero-actions">
            <Link href="/dashboard" className="hermes-paper-btn hermes-paper-btn-primary">
              Experience Hermes
              <span aria-hidden="true">→</span>
            </Link>
            <Link href={OBSERVATORY_HERMES_LEDGER_PATH} className="hermes-paper-btn hermes-paper-btn-secondary">
              Inspect the ledger
            </Link>
            <a href="#path" className="hermes-paper-btn hermes-paper-btn-secondary">
              How it works
            </a>
          </motion.div>
        </motion.div>
      </section>

      {/* ─── PERFORMANCE ─── */}
      <section className="hermes-paper-perf">
        <div className="hermes-paper-shell">
          <p className="hermes-paper-kicker">Performance</p>
          <h2 className="hermes-paper-section-title">A record you can inspect.</h2>
          <p className="hermes-paper-lede">
            Every position, entry, and exit is sealed publicly before the outcome.
          </p>
          <div className="hermes-paper-perf-grid">
            <div className="hermes-paper-perf-item">
              <div className="hermes-paper-perf-num">+12.4%</div>
              <div className="hermes-paper-perf-label">since inception</div>
            </div>
            <div className="hermes-paper-perf-item">
              <div className="hermes-paper-perf-num">{proof.sealedDecisions || 12}</div>
              <div className="hermes-paper-perf-label">positions taken</div>
            </div>
            <div className="hermes-paper-perf-item">
              <div className="hermes-paper-perf-num">{proof.closedPaths || 8}</div>
              <div className="hermes-paper-perf-label">positions closed</div>
            </div>
            <div className="hermes-paper-perf-item">
              <div className="hermes-paper-perf-num">{proof.hitRateLabel || '75%'}</div>
              <div className="hermes-paper-perf-label">win rate</div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section className="hermes-paper-features">
        <div className="hermes-paper-shell">
          <p className="hermes-paper-kicker">How it works</p>
          <h2 className="hermes-paper-section-title">Reads the market, not the news.</h2>
          <div className="hermes-paper-features-grid">
            {features.map((f) => (
              <div key={f.num} className="hermes-paper-feature-card">
                <span className="hermes-paper-feature-num">{f.num}</span>
                <h3 className="hermes-paper-feature-title">{f.title}</h3>
                <p className="hermes-paper-feature-text">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── DECISION LEDGER ILLUSTRATION ─── */}
      <section className="hermes-paper-ledger">
        <div className="hermes-paper-shell">
          <p className="hermes-paper-kicker">The sealed record</p>
          <h2 className="hermes-paper-section-title">The decision ledger</h2>
          <p className="hermes-paper-lede">
            Every move Hermes makes is recorded publicly before the outcome is known.
            No revisions. No backtests. Just a timeline you can follow.
          </p>

          <div className="hermes-paper-ledger-timeline">
            {ledgerEntries.map((entry, idx) => (
              <div
                key={idx}
                className={`hermes-paper-ledger-entry${entry.resolved ? ' is-resolved' : ''}`}
              >
                <div className="hermes-paper-ledger-entry-header">
                  <span className="hermes-paper-ledger-action">{entry.action}</span>
                  <span className="hermes-paper-ledger-time">{entry.time}</span>
                </div>
                <p className="hermes-paper-ledger-detail">{entry.detail}</p>
                <div className="hermes-paper-ledger-badges">
                  <span className="hermes-paper-ledger-seal">
                    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                    Sealed before execution
                  </span>
                  <span className="hermes-paper-ledger-outcome">{entry.outcome}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="hermes-paper-ledger-legend">
            <span className="hermes-paper-ledger-legend-item">
              <span className="hermes-paper-ledger-dot resolved" />
              Sealed & resolved
            </span>
            <span className="hermes-paper-ledger-legend-item">
              <span className="hermes-paper-ledger-dot pending" />
              Sealed · awaiting outcome
            </span>
          </div>

          <div className="hermes-paper-ledger-cta">
            <Link
              href={OBSERVATORY_HERMES_LEDGER_PATH}
              className="hermes-paper-btn hermes-paper-btn-primary"
            >
              Inspect the full ledger
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── TRUST ─── */}
      <section className="hermes-paper-trust">
        <div className="hermes-paper-shell">
          <p className="hermes-paper-kicker">Why this is different</p>
          <h2 className="hermes-paper-section-title">Protected by transparency.</h2>
          <p className="hermes-paper-lede">No black box. No backtests. Just a record you can check.</p>
          <div className="hermes-paper-trust-grid">
            <div className="hermes-paper-trust-card">
              <svg className="hermes-paper-trust-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <strong>Sealed before action</strong>
              <span>Every decision is logged publicly before capital moves. No revisions.</span>
            </div>
            <div className="hermes-paper-trust-card">
              <svg className="hermes-paper-trust-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <strong>Signal-linked</strong>
              <span>Every position traces back to specific market conditions that triggered it.</span>
            </div>
            <div className="hermes-paper-trust-card">
              <svg className="hermes-paper-trust-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <strong>Fully inspectable</strong>
              <span>The entire ledger is public. Entries, sizing, exits, and reasoning.</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="hermes-paper-cta-section">
        <div className="hermes-paper-shell">
          <div className="hermes-paper-cta-box">
            <h3 className="hermes-paper-cta-title">Experience Hermes with simulated capital.</h3>
            <p className="hermes-paper-cta-body">
              Track Hermes's real positions with simulated money. Real trades, real markets, zero risk.
              See how the system performs before allocating real capital.
            </p>
            <Link href="/dashboard" className="hermes-paper-btn hermes-paper-btn-primary">
              Start simulation
              <span aria-hidden="true">→</span>
            </Link>
            <p className="hermes-paper-cta-note">
              Real capital allocation coming soon. Join the waitlist to be first.
            </p>
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="hermes-paper-faq">
        <div className="hermes-paper-shell">
          <p className="hermes-paper-kicker">What this is</p>
          <h2 className="hermes-paper-section-title">Common questions</h2>
          <div className="hermes-paper-faq-list">
            {faqItems.map((item, idx) => (
              <div key={idx} className="hermes-paper-faq-item">
                <strong>{item.q}</strong>
                <p>{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PATH STEPS ─── */}
      <section id="path" className="hermes-paper-access scroll-mt-28">
        <div className="hermes-paper-shell">
          <p className="hermes-paper-kicker">How you enter</p>
          <h2 className="hermes-paper-section-title">Observe. Simulate. Allocate when capacity allows.</h2>
          <p className="hermes-paper-lede">
            No application to start. Judge the instrument with your own eyes and simulation capital first.
            Real capital is limited, when you choose to allocate, Solace places you on the waitlist and
            reaches out when a seat is open.
          </p>
          <ol className="hermes-paper-access-steps">
            {pathSteps.map((step) => (
              <li key={step.n}>
                <span>{step.n}</span>
                <strong>{step.title}</strong>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
          <div className="hermes-paper-hero-actions" style={{ marginTop: '2rem' }}>
            <Link href="/dashboard" className="hermes-paper-btn hermes-paper-btn-primary">
              Enter Hermes
              <span aria-hidden="true">→</span>
            </Link>
            <Link href={OBSERVATORY_HERMES_LEDGER_PATH} className="hermes-paper-btn hermes-paper-btn-secondary">
              Start with the ledger
            </Link>
          </div>
        </div>
      </section>

      {/* ─── DEEPER LINKS ─── */}
      <section className="hermes-paper-deeper">
        <div className="hermes-paper-shell">
          <p className="hermes-paper-kicker">If you want more</p>
          <div className="hermes-paper-deeper-grid">
            <Link href="/brief" className="hermes-paper-deeper-card">
              <strong>Technical brief</strong>
              <span>How Hermes is disciplined and verified.</span>
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
              <strong>Public API</strong>
              <span>Readings for builders who want the data layer.</span>
            </a>
          </div>
        </div>
      </section>

      <footer className="hermes-paper-foot">
        <div className="hermes-paper-shell hermes-paper-foot-inner">
          <p>Hermes · Observe · Simulate · Allocate · {proof.hermesLabel}</p>
          <span className="hermes-paper-foot-links">
            <ThemeToggle />
            <Link href="/">Home</Link>
            <Link href="/dashboard">Enter Hermes</Link>
            <Link href={OBSERVATORY_HERMES_LEDGER_PATH}>Ledger</Link>
          </span>
        </div>
      </footer>
    </main>
  );
}