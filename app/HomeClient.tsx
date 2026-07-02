'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import { MotionConfig, motion } from 'framer-motion';

import SkyBackground from './SkyBackground';
import Mark from './Mark';
import { calibration } from './calibration';
import { hermesBetaVersionLabel } from '@/features/hermes-version';

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

const sectionReveal = {
  initial: { opacity: 0, y: 26 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-14% 0px -14% 0px' },
  transition: { duration: 0.9, ease },
};

const cardReveal = (index: number) => ({
  ...sectionReveal,
  viewport: { once: true, margin: '-8% 0px -8% 0px' },
  transition: { ...sectionReveal.transition, delay: index * 0.08 },
});

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

const footerSocials = [{ name: 'X @solacefyi', href: 'https://x.com/solacefyi' }];
const footerEmails = ['hello@solace.fyi', 'support@solace.fyi', 'security@solace.fyi'];

function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="site-wordmark" aria-label="Solace home">
          <Mark size={26} className="site-mark" />
          Solace
        </Link>

        <nav className="site-nav" aria-label="Primary navigation">
          <Link href="/brief">
            Brief
          </Link>
          <Link href="/research">
            Research
          </Link>
          <Link href="/hermes">
            Hermes
          </Link>
          <Link href="/oracle">
            Oracle
          </Link>
        </nav>

        <div className="site-actions">
          <Link href="/dashboard" className="site-action-link site-action-login">
            Login
          </Link>
          <span className="site-action-separator" aria-hidden="true" />
          <Link href="/hermes#request-access" className="site-action-link site-action-primary">
            Request access
          </Link>
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
        <Link href="/research" onClick={() => setMenuOpen(false)}>
          Research
        </Link>
        <Link href="/hermes" onClick={() => setMenuOpen(false)}>
          Hermes
        </Link>
        <Link href="/oracle" onClick={() => setMenuOpen(false)}>
          Oracle
        </Link>
        <Link href="/dashboard" onClick={() => setMenuOpen(false)}>
          Login
        </Link>
      </div>
    </header>
  );
}

export type LatestNote = {
  title: string;
  dek: string;
  label: string;
};

// 'quiet' = xAI-style centered hero, no atmosphere render — type on night sky.
// 'observatory' = the original left-aligned hero with the instrument render.
const HERO_VARIANT: 'observatory' | 'quiet' = 'quiet';

// 'cards' = instrument card grid on a plain dark background (renders live
// inside the cards). 'sections' = the original full-bleed sections over the
// star-plate sky.
const HOME_LAYOUT: 'sections' | 'cards' = 'cards';

export default function HomeClient({ latestNote }: { latestNote: LatestNote }) {
  return (
    <main className="home-shell relative min-h-screen overflow-x-hidden text-foreground">
      <MotionConfig reducedMotion="user">
      {HOME_LAYOUT === 'sections' && <SkyBackground />}
      <Header />

      {HERO_VARIANT === 'quiet' ? (
        <section className="hero-quiet relative overflow-hidden px-5 md:px-8">
          <motion.div
            initial="hidden"
            animate="show"
            variants={stagger}
            className="hero-quiet-inner relative z-10 mx-auto max-w-5xl"
          >
            <motion.div variants={fade}>
              <Link href="/research" className="hero-note-pill">
                <span className="hero-note-pill-tag">Latest research</span>
                <span className="hero-note-pill-title">{latestNote.title}</span>
                <span aria-hidden="true">→</span>
              </Link>
            </motion.div>
            <motion.p variants={fade} className="section-kicker mt-7">
              Independent research observatory
            </motion.p>
            <motion.h1 variants={fade} className="hero-quiet-title">
              Systems for reading complexity.
            </motion.h1>
            <motion.p variants={fade} className="hero-quiet-body">
              Solace builds instruments for decision-making under uncertainty — beginning in markets,
              where feedback arrives in days instead of years.
            </motion.p>
            <motion.div variants={fade} className="hero-quiet-actions">
              <Link href="/hermes" className="hermes-product-button hermes-product-button-light">
                Explore Hermes
              </Link>
              <Link href="/brief" className="hermes-product-button hermes-product-button-dark">
                Read the brief
              </Link>
            </motion.div>
          </motion.div>
        </section>
      ) : (
      <section className="hero-luxury relative min-h-[86vh] overflow-hidden px-5 pb-20 pt-32 md:px-8 md:pb-24 md:pt-36">
        <div className="hero-render" aria-hidden="true">
          <HeroObservatoryRender />
        </div>
        <div className="hero-vignette" />

        <motion.div
          initial="hidden"
          animate="show"
          variants={stagger}
          className="hero-content relative z-10 mx-auto grid max-w-7xl items-center"
        >
          <div className="hero-copy max-w-3xl">
            <motion.div variants={fade}>
              <Link href="/research" className="hero-note-pill">
                <span className="hero-note-pill-tag">Latest research</span>
                <span className="hero-note-pill-title">{latestNote.title}</span>
                <span aria-hidden="true">→</span>
              </Link>
            </motion.div>
            <motion.p variants={fade} className="section-kicker mt-6">
              Independent research observatory
            </motion.p>
            <motion.h1
              variants={fade}
              className="hero-title mt-6 max-w-3xl font-serif text-[clamp(3.4rem,9vw,8rem)] font-medium leading-[0.9]"
            >
              Systems for reading complexity.
            </motion.h1>
            <motion.p variants={fade} className="hero-body mt-7 max-w-2xl text-lg leading-8 text-muted md:text-xl">
              Solace builds instruments for decision-making under uncertainty — beginning in markets, where
              feedback arrives in days instead of years. Every system observes, models, deploys, and keeps only
              what survives contact with the world.
            </motion.p>
            <motion.div variants={fade} className="hero-actions mt-9 flex flex-wrap items-center gap-x-7 gap-y-3">
              <Link href="/brief" className="primary-link">
                Read the brief
              </Link>
              <Link href="/hermes" className="hermes-product-button hermes-product-button-dark min-h-[2.75rem]">
                Explore Hermes
              </Link>
            </motion.div>
          </div>
        </motion.div>

        <motion.div
          className="hero-caption"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.1, delay: 0.9, ease }}
        >
          <span>Markets · Live</span>
          <span>Simulation · Building</span>
          <span>Autonomy · Gated</span>
        </motion.div>
      </section>
      )}

      {HOME_LAYOUT === 'cards' ? (
      <section id="instruments" className="inst-wrap px-5 md:px-8">
        <div className="inst-grid mx-auto max-w-7xl">
          <motion.div id="hermes" className="inst-cell inst-cell-hermes scroll-mt-24" {...cardReveal(0)}>
            <Link href="/hermes" className="inst-card">
              <div className="inst-card-render" aria-hidden="true">
                <HermesLiquidityFieldRender />
              </div>
              <div className="inst-card-scrim" aria-hidden="true" />
              <span className="inst-chip is-live">Live · {hermesBetaVersionLabel.replace(/^Hermes\s+/, '')}</span>
              <div className="inst-card-foot">
                <div className="inst-card-name">
                  <strong>Hermes</strong>
                  <p>Decides when capital moves, and when it doesn&apos;t.</p>
                </div>
                <span className="inst-card-cta">Explore →</span>
              </div>
            </Link>
          </motion.div>

          <motion.div id="oracle" className="inst-cell inst-cell-oracle scroll-mt-24" {...cardReveal(1)}>
            <Link href="/oracle" className="inst-card">
              <div className="inst-card-render" aria-hidden="true">
                <OracleFuturesRender />
              </div>
              <div className="inst-card-scrim" aria-hidden="true" />
              <span className="inst-chip is-cal">Calibrating</span>
              <div className="inst-card-metrics">
                <span>
                  <em>Resolved</em>
                  <strong>{calibration.resolved}</strong>
                </span>
                <span>
                  <em>Brier</em>
                  <strong>{calibration.brier.toFixed(2)}</strong>
                </span>
                <span>
                  <em>As of</em>
                  <strong>{calibration.asOf}</strong>
                </span>
              </div>
              <div className="inst-card-foot">
                <div className="inst-card-name">
                  <strong>Oracle</strong>
                  <p>Live probability over real events, scored against what happened.</p>
                </div>
                <span className="inst-card-cta">Live record →</span>
              </div>
            </Link>
          </motion.div>

          <motion.div className="inst-cell inst-cell-sim" {...cardReveal(2)}>
            <div className="inst-card inst-card-quiet">
              <span className="inst-chip is-idle">Building</span>
              <div className="inst-card-foot">
                <div className="inst-card-name">
                  <strong>Simulation</strong>
                  <p>Synthetic environments where hypotheses fail quietly before deployment.</p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div className="inst-cell inst-cell-auto" {...cardReveal(3)}>
            <Link href="/brief#section-07" className="inst-card inst-card-quiet">
              <span className="inst-chip is-idle">Gated · 0 of 4 conditions met</span>
              <div className="inst-card-foot">
                <div className="inst-card-name">
                  <strong>Autonomy</strong>
                  <p>Domains are earned, not declared.</p>
                </div>
                <span className="inst-card-cta">Gate conditions →</span>
              </div>
            </Link>
          </motion.div>
        </div>
      </section>
      ) : (
      <>
      <section id="hermes" className="hermes-section scroll-mt-24">
        <div className="hermes-product-bg" aria-hidden="true">
          <HermesLiquidityFieldRender />
        </div>
        <div className="hermes-product-shell relative z-10 mx-auto flex max-w-7xl flex-col justify-center px-5 py-24 md:px-8 md:py-28">
          <motion.div className="hermes-product-copy" {...sectionReveal}>
            <p className="section-kicker">The first instrument</p>
            <h2>Hermes decides when capital moves, and when it doesn&apos;t.</h2>
            <p>
              A live capital allocation engine for markets under uncertainty. Hermes reads liquidity, timing,
              and regime, and commits capital only when all three agree.
            </p>
            <span className="hermes-beta-version">{hermesBetaVersionLabel}</span>

            <div className="hermes-product-actions">
              <Link href="/hermes" className="hermes-product-button hermes-product-button-light">
                Learn More
              </Link>
              <Link href="/brief" className="hermes-product-button hermes-product-button-dark">
                View brief
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <section id="oracle" className="oracle-section scroll-mt-24">
        <div className="oracle-product-bg" aria-hidden="true">
          <OracleFuturesRender />
        </div>
        <div className="hermes-product-shell relative z-10 mx-auto flex w-full max-w-7xl flex-col justify-center px-5 py-24 md:px-8 md:py-28">
          <motion.div className="hermes-product-copy lg:ml-auto" {...sectionReveal}>
            <p className="section-kicker">The second instrument</p>
            <h2>The Oracle weighs the futures.</h2>
            <p>Live probability over real events — every prediction scored against what actually happened.</p>

            <div className="hermes-product-metrics">
              <div>
                <span>Resolved</span>
                <strong>{calibration.resolved}</strong>
              </div>
              <div>
                <span>Brier</span>
                <strong>{calibration.brier.toFixed(2)}</strong>
              </div>
              <div>
                <span>Calibration</span>
                <strong>Overconfident</strong>
              </div>
            </div>
            <p className="mt-3 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-white/40">
              Calibration labels are published as measured
            </p>

            <div className="hermes-product-actions">
              <Link href="/oracle" className="hermes-product-button hermes-product-button-light">
                See the live record
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
      </>
      )}

      <section className="research-strip px-5 md:px-8">
        <motion.div className="research-strip-inner mx-auto max-w-7xl" {...sectionReveal}>
          <div className="research-strip-copy">
            <p className="section-kicker">Latest from the observatory</p>
            <h3>{latestNote.title}</h3>
            <p className="research-strip-dek">{latestNote.dek}</p>
          </div>
          <div className="research-strip-meta">
            <span>{latestNote.label}</span>
            <Link href="/research" className="primary-link">
              Read the note
            </Link>
          </div>
        </motion.div>
      </section>

      <footer className="site-footer px-5 pb-10 pt-14 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 border-t border-white/10 pt-12 md:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_0.8fr_1.1fr]">
            <div>
              <p className="flex items-center gap-3 font-serif text-3xl font-medium text-foreground">
                <Mark size={36} className="site-mark" />
                Solace
              </p>
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
                  <Link href="/research">Research</Link>
                </li>
                <li>
                  <Link href="/hermes#request-access">Request access</Link>
                </li>
                <li>
                  <Link href="/terms">Terms of service</Link>
                </li>
                <li>
                  <Link href="/privacy">Privacy policy</Link>
                </li>
              </ul>
            </div>

            <div className="footer-col">
              <p className="footer-heading">Socials</p>
              <ul>
                {footerSocials.map((social) => (
                  <li key={social.name}>
                    <a href={social.href} target="_blank" rel="noreferrer">
                      {social.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="footer-col">
              <p className="footer-heading">Contact</p>
              <ul>
                {footerEmails.map((email) => (
                  <li key={email}>
                    <a href={`mailto:${email}`}>{email}</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-12 flex flex-col gap-2 border-t border-white/10 pt-5 md:flex-row md:items-center md:justify-between">
            <p className="footer-fineprint">© 2026 Solace. All rights reserved.</p>
            <p className="footer-fineprint">Domains are earned</p>
          </div>
        </div>
      </footer>
      </MotionConfig>
    </main>
  );
}
