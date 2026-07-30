'use client';

import Link from 'next/link';
import { useState } from 'react';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';

import { OBSERVATORY_HERMES_LEDGER_PATH } from '@/features/observatory/paths';
import { DOCS_API_URL } from '@/lib/docs';

import Mark from '../Mark';
import ThemeToggle from '../ThemeToggle';
import ProductShots from './ProductShots';

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

/** Observe → Simulate → Allocate, no application form to enter the instrument. */
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
            <a href="#see-it" onClick={() => setMenuOpen(false)}>
              See it
            </a>
            <a href="#path" onClick={() => setMenuOpen(false)}>
              How it works
            </a>
            <Link href={OBSERVATORY_HERMES_LEDGER_PATH} onClick={() => setMenuOpen(false)}>
              Ledger
            </Link>
            <Link href="/dashboard" onClick={() => setMenuOpen(false)}>
              Enter Hermes
            </Link>
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
            Your capital should work as hard as you do.
          </motion.h1>
          <motion.p variants={fade} className="hermes-paper-hero-lede">
            Hermes is an autonomous instrument designed to make better capital allocation decisions on your
            behalf. It continuously evaluates opportunities and acts with discipline, so your capital can
            compound without requiring your constant attention.
          </motion.p>
          <motion.p variants={fade} className="hermes-paper-status">
            Simulation open · founder capital live on the ledger · real capital by waitlist
          </motion.p>
          <motion.div variants={fade} className="hermes-paper-hero-actions">
            <Link href="/dashboard" className="hermes-paper-btn hermes-paper-btn-primary">
              Enter Hermes
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

      {/* Only two product illustrations: dashboard + ledger */}
      <div id="see-it" className="scroll-mt-28">
        <ProductShots />
      </div>

      {/* Observe → Simulate → Allocate */}
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
