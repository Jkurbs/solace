'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import { motion } from 'framer-motion';

import SkyBackground from './SkyBackground';

const HermesLiquidityFieldRender = dynamic(() => import('./HermesLiquidityFieldRender'), {
  ssr: false,
});

const HeroObservatoryRender = dynamic(() => import('./HeroObservatoryRender'), {
  ssr: false,
});

const OracleFuturesRender = dynamic(() => import('./OracleFuturesRender'), {
  ssr: false,
});

const ease = [0.16, 1, 0.3, 1] as [number, number, number, number];

const fade = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 1, ease },
  },
};

const stagger = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.18,
    },
  },
};

const footerSystems = [
  { name: 'Hermes', status: 'Live', href: '#hermes' },
  { name: 'Oracle', status: 'Calibrating', href: '#oracle' },
  { name: 'Simulation', status: 'Building' },
  { name: 'Autonomy', status: 'Gated' },
];

const hermesMetrics = [
  {
    label: 'Signal',
    value: 'Structure',
  },
  {
    label: 'Posture',
    value: 'Selective',
  },
  {
    label: 'Feedback',
    value: 'Live',
  },
];

function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="site-wordmark" aria-label="Solace home">
          Solace
        </Link>

        <nav className="site-nav" aria-label="Primary navigation">
          <Link href="/brief">
            Brief
          </Link>
          <a href="#hermes">
            Hermes
          </a>
          <a href="#oracle">
            Oracle
          </a>
        </nav>

        <div className="site-actions">
          <a
            href="mailto:jkurbs18@gmail.com?subject=Solace%20access"
            className="site-action-link site-action-primary"
          >
            Access
          </a>
          <button
            type="button"
            className={`site-menu-button${menuOpen ? ' is-open' : ''}`}
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>
      <div className={`site-menu-panel${menuOpen ? ' is-open' : ''}`}>
        <Link href="/brief" onClick={() => setMenuOpen(false)}>
          Brief
        </Link>
        <a href="#hermes" onClick={() => setMenuOpen(false)}>
          Hermes
        </a>
        <a href="#oracle" onClick={() => setMenuOpen(false)}>
          Oracle
        </a>
      </div>
    </header>
  );
}

export default function Home() {
  return (
    <main className="home-shell relative min-h-screen overflow-x-hidden text-foreground">
      <SkyBackground />
      <Header />

      <section className="hero-luxury relative min-h-[92vh] overflow-hidden px-5 pb-24 pt-32 md:px-8 md:pb-28 md:pt-36">
        <div className="hero-render" aria-hidden="true">
          <HeroObservatoryRender />
        </div>
        <div className="hero-vignette" />

        <motion.div
          initial={false}
          animate="show"
          variants={stagger}
          className="hero-content relative z-10 mx-auto grid max-w-7xl items-center"
        >
          <div className="hero-copy max-w-3xl">
            <motion.p variants={fade} className="section-kicker">
              Private intelligence observatory
            </motion.p>
            <motion.h1
              variants={fade}
              className="hero-title mt-6 max-w-3xl font-serif text-[clamp(3.4rem,9vw,8rem)] font-medium leading-[0.9]"
            >
              Systems for reading complexity.
            </motion.h1>
            <motion.p variants={fade} className="hero-body mt-7 max-w-2xl text-base leading-8 text-muted md:text-lg">
              Solace builds instruments for uncertainty: systems that observe, model, deploy, and keep only what
              survives contact with the world.
            </motion.p>
            <motion.div variants={fade} className="hero-actions mt-9 flex flex-wrap items-center gap-x-7 gap-y-3">
              <Link href="/brief" className="primary-link">
                Read the brief
              </Link>
              <a href="#hermes" className="hermes-product-button hermes-product-button-dark min-h-[2.75rem]">
                Enter Hermes
              </a>
            </motion.div>
          </div>
        </motion.div>

        <div className="hero-caption">
          <span>Hermes</span>
          <span>Live system</span>
          <span>Market structure</span>
        </div>
      </section>

      <section id="hermes" className="hermes-section scroll-mt-24">
        <div className="hermes-product-bg" aria-hidden="true">
          <HermesLiquidityFieldRender />
        </div>
        <div className="hermes-render-caption" aria-hidden="true">
          Liquidity field · 6 candidate paths · 1 survivor
        </div>
        <div className="hermes-product-shell relative z-10 mx-auto flex max-w-7xl flex-col justify-center px-5 py-24 md:px-8 md:py-28">
          <div className="hermes-product-copy">
            <p className="section-kicker">The first instrument</p>
            <h2>Hermes is the first instrument.</h2>
            <p>
              Live market intelligence for liquidity, timing, and regime structure. Built for operators who need
              signal before consensus.
            </p>
            <div className="hermes-product-actions">
              <a
                href="mailto:jkurbs18@gmail.com?subject=Hermes%20access"
                className="hermes-product-button hermes-product-button-light"
              >
                Request access
              </a>
              <Link href="/brief" className="hermes-product-button hermes-product-button-dark">
                View brief
              </Link>
            </div>

            <div className="hermes-product-metrics">
              {hermesMetrics.map((metric) => (
                <div key={metric.label}>
                  <span>{metric.label}</span>
                  <strong>{metric.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="oracle" className="oracle-section scroll-mt-24">
        <div className="oracle-product-bg" aria-hidden="true">
          <OracleFuturesRender />
        </div>
        <div className="hermes-render-caption oracle-caption" aria-hidden="true">
          Event markets · 7 futures weighted · 1 resolved
        </div>
        <div className="hermes-product-shell relative z-10 mx-auto flex w-full max-w-7xl flex-col justify-center px-5 py-24 md:px-8 md:py-28">
          <div className="hermes-product-copy lg:ml-auto">
            <p className="section-kicker">The second instrument</p>
            <h2>The Oracle weighs the futures.</h2>
            <p>
              Live probability over real events. Hermes reads the field and acts; the Oracle holds the
              question open until the world answers — and keeps score when it does.
            </p>

            <div className="hermes-product-metrics">
              <div>
                <span>Domain</span>
                <strong>Events</strong>
              </div>
              <div>
                <span>Method</span>
                <strong>Probability</strong>
              </div>
              <div>
                <span>Status</span>
                <strong>Calibrating</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="site-footer px-5 pb-10 pt-14 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 border-t border-white/10 pt-12 md:grid-cols-[1.3fr_1fr_1fr]">
            <div>
              <p className="font-serif text-3xl font-medium text-foreground">Solace</p>
              <p className="mt-3 max-w-xs text-sm leading-7 text-muted">
                Independent research company. Instruments for uncertainty, kept only when they survive
                contact with the world.
              </p>
              <p className="footer-stamp">Founded 2026 · Built for decades</p>
              <p className="footer-stamp">
                Built by{' '}
                <Link href="/brief#author" className="footer-stamp-link">
                  Kerby Jean
                </Link>
              </p>
            </div>

            <div className="footer-col">
              <p className="footer-heading">Instruments</p>
              <ul>
                {footerSystems.map((system) => (
                  <li key={system.name}>
                    {system.href ? (
                      <a href={system.href}>{system.name}</a>
                    ) : (
                      <span className="footer-static">{system.name}</span>
                    )}
                    <span className="footer-status">{system.status}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="footer-col">
              <p className="footer-heading">Company</p>
              <ul>
                <li>
                  <Link href="/brief">Technical brief</Link>
                </li>
                <li>
                  <a href="mailto:jkurbs18@gmail.com?subject=Solace%20access">Request access</a>
                </li>
                <li>
                  <a href="mailto:jkurbs18@gmail.com">Contact</a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 flex flex-col gap-2 border-t border-white/10 pt-5 md:flex-row md:items-center md:justify-between">
            <p className="footer-fineprint">© 2026 Solace. All rights reserved.</p>
            <p className="footer-fineprint">Domains are earned</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
