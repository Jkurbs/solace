'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { MotionConfig, motion, useReducedMotion } from 'framer-motion';

import SkyBackground from './SkyBackground';
import Mark from './Mark';
import ThemeToggle from './ThemeToggle';
import NotePlate from './NotePlate';
import { getAutonomyGateHeadline, getGateBoardHeadline } from '@/features/gates/conditions';

import { calibration } from './calibration';
import type { HermesPublicPosture } from '@/features/hermes-public-reading/types';
import { hermesBetaVersionLabel } from '@/features/hermes-version';
import type { PlateTint } from '@/lib/note-plate';

const HermesLiquidityFieldRender = dynamic(() => import('./HermesLiquidityFieldRender'), {
  ssr: false,
});

const HeroObservatoryRender = dynamic(() => import('./HeroObservatoryRender'), {
  ssr: false,
});

const OracleFuturesRender = dynamic(() => import('./OracleFuturesRender'), {
  ssr: false,
});

const SimulationEnsembleRender = dynamic(() => import('./SimulationEnsembleRender'), {
  ssr: false,
});

// Title-card cadence: long holds, short travel, no bounce. MotionConfig
// reducedMotion="user" zeros this out for system-level reduced-motion prefs.
const easeOut = [0.16, 1, 0.3, 1] as [number, number, number, number];
const easeSoft = [0.22, 1, 0.36, 1] as [number, number, number, number];

const fade = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, ease: easeOut },
  },
};

const titleFade = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 1, ease: easeSoft },
  },
};

const sectionReveal = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.18, margin: '0px 0px -6% 0px' },
  transition: { duration: 0.9, ease: easeOut },
};

const cardReveal = (index: number) => ({
  initial: { opacity: 0, y: 26 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.12, margin: '0px 0px -4% 0px' },
  transition: { duration: 0.82, ease: easeOut, delay: Math.min(index * 0.075, 0.3) },
});

const stagger = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.06,
    },
  },
};

const listStagger = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.04,
    },
  },
};

const listItem = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: easeOut },
  },
};

const footerSystems: Array<{ name: string; status: string; href?: string; hint?: string }> = [
  { name: 'Hermes', status: 'Live', href: '#hermes' },
  { name: 'Oracle', status: 'Keeping score', href: '#oracle' },
  {
    name: 'Simulation',
    status: 'Building',
    href: '/gates#simulation',
    hint: 'Synthetic environments where hypotheses fail quietly before deployment.',
  },
  {
    name: 'Autonomy',
    status: 'Gated',
    href: '/gates#autonomy',
    hint: 'Beyond markets. Four conditions have to clear first.',
  },
];

const autonomyGateHeadline = getAutonomyGateHeadline();
const gateBoardHeadline = getGateBoardHeadline();

const homepageQuestions = [
  {
    question: 'What is Solace?',
    answer: 'Solace builds instruments for disciplined capital allocation under uncertainty.',
  },
  {
    question: 'What is Hermes?',
    answer:
      'Hermes is the first instrument: a live capital allocation engine that reads market structure to decide when capital should move, wait, or be preserved.',
  },
  {
    question: 'Does Hermes manage customer funds?',
    answer:
      'Not yet. Hermes is in controlled access, with public readings and beta systems separated from customer capital.',
  },
  {
    question: 'What does live mean?',
    answer:
      'Hermes updates from fresh market readings and only shows public-safe posture, timing, and capital-state summaries.',
  },
  {
    question: 'What is Oracle?',
    answer: 'Oracle is the calibration layer: it scores probability calls against what actually happened.',
  },
];

const footerSocials = [{ name: 'X @solacefyi', href: 'https://x.com/solacefyi' }];
const footerEmails = ['hello@solace.fyi', 'support@solace.fyi', 'security@solace.fyi'];

function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="site-wordmark" aria-label="Solace home">
          <Mark size={20} className="site-mark" />
          Solace
        </Link>

        <nav className="site-nav" aria-label="Primary navigation">
          <Link href="/brief">
            Brief
          </Link>
          <Link href="/research">
            Research
          </Link>
          <Link href="/news">
            News
          </Link>
          <Link href="/trust">
            Trust
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
        <Link href="/news" onClick={() => setMenuOpen(false)}>
          News
        </Link>
        <Link href="/trust" onClick={() => setMenuOpen(false)}>
          Trust
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

export type HeroPill = {
  tag: string;
  title: string;
  href: string;
};

export type NewsItem = {
  slug: string;
  title: string;
  dek: string;
  label: string;
  date: string;
  tint: PlateTint;
};

/** Process-first ledger teaser for the homepage vault strip. */
export type LedgerVaultSummary = {
  sealedDecisions: number;
  openPaths: number | null;
  closedPaths: number;
  backfilled: number;
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

const hermesLiveVoice: Record<HermesPublicPosture, { phrase: string; tone: string }> = {
  DEPLOYED: { phrase: 'putting capital to work', tone: '#8db89d' },
  SELECTIVE: { phrase: 'waiting for a cleaner opening', tone: '#d6d0c4' },
  DEFENSIVE: { phrase: 'protecting capital first', tone: '#d3b585' },
  STANDING_DOWN: { phrase: 'standing down', tone: '#a3a3a3' },
  RISK_OFF: { phrase: 'paused by risk controls', tone: '#a3a3a3' },
};

function lowerFirst(value: string) {
  return value.charAt(0).toLowerCase() + value.slice(1);
}

function getHermesPathPhrase(telemetry: HermesTelemetry) {
  const marketNoun = telemetry.pathsCount === 1 ? 'market' : 'markets';
  const rawLabel = telemetry.pathsLabel.trim().toLowerCase();
  const label = rawLabel === 'markets watched' || rawLabel === 'watched' ? 'watched' : rawLabel || 'watched';

  return `${telemetry.pathsCount} ${marketNoun} ${label}`;
}

function getHermesCapitalPhrase(telemetry: HermesTelemetry) {
  const pathsPhrase = getHermesPathPhrase(telemetry);
  const reason = telemetry.reason?.trim();

  if (typeof telemetry.deployedCount === 'number') {
    return telemetry.deployedCount > 0
      ? `with capital active in ${telemetry.deployedCount} of ${pathsPhrase}`
      : `with no capital deployed across ${pathsPhrase}`;
  }

  // Paths-under-review counts describe the watchlist, not live deployment.
  switch (telemetry.posture) {
    case 'DEPLOYED':
      return reason ? `with ${lowerFirst(reason)}` : 'with active exposure in the field';
    case 'DEFENSIVE':
      return reason ? `with ${lowerFirst(reason)}` : 'while protecting open exposure';
    case 'RISK_OFF':
    case 'STANDING_DOWN':
      return reason ? `with ${lowerFirst(reason)}` : 'while standing down';
    case 'SELECTIVE':
    default:
      return `while watching ${pathsPhrase}`;
  }
}

function HermesLiveBriefing({ telemetry }: { telemetry: HermesTelemetry }) {
  const voice = hermesLiveVoice[telemetry.posture];
  const condition = telemetry.condition?.trim();
  const conditionPhrase = condition ? ` in ${lowerFirst(condition)} conditions` : ' as the market changes';
  const capitalPhrase = getHermesCapitalPhrase(telemetry);

  return (
    <>
      Live now: Hermes is currently <strong style={{ color: voice.tone }}>{voice.phrase}</strong>
      {conditionPhrase}, {capitalPhrase}.{' '}
      <span title="When Hermes last reported its assessment of market conditions.">Last update</span>:{' '}
      <ReadingAge updatedAt={telemetry.updatedAt} />.
    </>
  );
}

// Relative age computed client-side so ISR caching can't freeze "2h ago".
// Rendered with a real value from the first frame — a bare "—" placeholder
// reads like a dashboard awaiting model output.
function formatReadingAge(updatedAt: string) {
  const ageMs = Date.now() - new Date(updatedAt).getTime();

  if (!Number.isFinite(ageMs) || ageMs < 0) {
    return 'just now';
  }

  const minutes = Math.floor(ageMs / 60_000);
  return minutes < 1 ? 'just now' : minutes < 60 ? `${minutes}m ago` : `${Math.floor(minutes / 60)}h ago`;
}

function ReadingAge({ updatedAt }: { updatedAt: string }) {
  const [label, setLabel] = useState(() => formatReadingAge(updatedAt));

  useEffect(() => {
    const update = () => setLabel(formatReadingAge(updatedAt));

    update();
    const interval = window.setInterval(update, 60_000);
    return () => window.clearInterval(interval);
  }, [updatedAt]);

  return <span suppressHydrationWarning>{label}</span>;
}

const newsDateFormat = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

// 'quiet' = xAI-style centered hero, no atmosphere render — type on night sky.
// 'observatory' = the original left-aligned hero with the instrument render.
const HERO_VARIANT: 'observatory' | 'quiet' = 'quiet';

// 'cards' = instrument card grid on a plain dark background (renders live
// inside the cards). 'sections' = the original full-bleed sections over the
// star-plate sky.
const HOME_LAYOUT: 'sections' | 'cards' = 'cards';

export default function HomeClient({
  hermesTelemetry,
  latestNote,
  ledgerVault,
  newsItems,
  pill,
}: {
  hermesTelemetry: HermesTelemetry | null;
  latestNote: LatestNote;
  ledgerVault: LedgerVaultSummary;
  newsItems: NewsItem[];
  pill: HeroPill;
}) {
  const reduceMotion = useReducedMotion();
  // reducedMotion users skip entrance; everyone else gets the title-card stagger.
  const heroInitial = reduceMotion ? false : 'hidden';

  return (
    <main className="home-shell relative min-h-screen overflow-x-hidden text-foreground">
      <MotionConfig reducedMotion="user">
      {HOME_LAYOUT === 'sections' && <SkyBackground />}
      <Header />

      {HERO_VARIANT === 'quiet' ? (
        <section className="hero-quiet relative overflow-hidden px-5 md:px-10">
          <motion.div
            initial={heroInitial}
            animate="show"
            variants={stagger}
            className="hero-quiet-inner relative z-10 mx-auto max-w-6xl"
          >
            <motion.div variants={fade}>
              <Link href={pill.href} className="hero-note-pill">
                <span className="hero-note-pill-tag">{pill.tag}</span>
                <span className="hero-note-pill-title">{pill.title}</span>
                <span aria-hidden="true">→</span>
              </Link>
            </motion.div>
            <motion.p variants={fade} className="section-kicker mt-8">
              Independent research observatory
            </motion.p>
            <motion.h1 variants={titleFade} className="hero-quiet-title">
              Systems for reading complexity.
            </motion.h1>
            <motion.p variants={fade} className="hero-quiet-body">
              Solace builds instruments for disciplined capital allocation under uncertainty. Capital moves
              only when structure, regime, and timing agree — and most hours, they do not.
            </motion.p>
            <motion.div variants={fade} className="hero-quiet-actions">
              <Link href="/brief" className="hermes-product-button hermes-product-button-light">
                Read the brief
              </Link>
              <div className="hero-quiet-actions-row">
                <Link href="/hermes" className="hermes-product-button hermes-product-button-dark">
                  Explore Hermes
                </Link>
                <Link href="/trust" className="hermes-product-button hermes-product-button-dark">
                  Decision ledger
                </Link>
              </div>
            </motion.div>
            <motion.p variants={fade} className="hero-gloss">
              An instrument here is a system Solace builds and operates, not a financial product. New to
              Solace? <a href="#faq">Start with the questions</a>.
            </motion.p>
          </motion.div>
        </section>
      ) : (
      <section className="hero-luxury relative min-h-[86vh] overflow-hidden px-5 pb-20 pt-32 md:px-8 md:pb-24 md:pt-36">
        <div className="hero-render" aria-hidden="true">
          <HeroObservatoryRender />
        </div>
        <div className="hero-vignette" />

        <motion.div
          initial={heroInitial}
          animate="show"
          variants={stagger}
          className="hero-content relative z-10 mx-auto grid max-w-7xl items-center"
        >
          <div className="hero-copy max-w-3xl">
            <motion.div variants={fade}>
              <Link href={pill.href} className="hero-note-pill">
                <span className="hero-note-pill-tag">{pill.tag}</span>
                <span className="hero-note-pill-title">{pill.title}</span>
                <span aria-hidden="true">→</span>
              </Link>
            </motion.div>
            <motion.p variants={fade} className="section-kicker mt-6">
              Independent research observatory
            </motion.p>
            <motion.h1
              variants={titleFade}
              className="hero-title mt-6 max-w-3xl font-serif text-[clamp(3.4rem,9vw,8rem)] font-medium leading-[0.9]"
            >
              Systems for reading complexity.
            </motion.h1>
            <motion.p variants={fade} className="hero-body mt-7 max-w-2xl text-lg leading-8 text-muted md:text-xl">
              Solace builds instruments for disciplined capital allocation under uncertainty.
            </motion.p>
            <motion.div variants={fade} className="hero-actions mt-9">
              <Link href="/brief" className="primary-link">
                Read the brief
              </Link>
              <div className="hero-actions-row">
                <Link href="/hermes" className="hermes-product-button hermes-product-button-dark min-h-[2.75rem]">
                  Explore Hermes
                </Link>
                <Link href="/trust" className="hermes-product-button hermes-product-button-dark min-h-[2.75rem]">
                  Decision ledger
                </Link>
              </div>
            </motion.div>
            <motion.p variants={fade} className="hero-gloss">
              An instrument here is a system Solace builds and operates, not a financial product. New to
              Solace? <a href="#faq">Start with the questions</a>.
            </motion.p>
          </div>
        </motion.div>

        <motion.div
          className="hero-caption"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.75, ease: easeOut }}
        >
          <span>Markets · Live</span>
          <span>Simulation · Building</span>
          <span>Autonomy · Gated</span>
        </motion.div>
      </section>
      )}

      {HOME_LAYOUT === 'cards' ? (
      <>
      <section id="instruments" className="inst-wrap px-5 md:px-10">
        <div className="inst-grid mx-auto max-w-7xl">
          <motion.div id="hermes" className="inst-cell inst-cell-hermes scroll-mt-24" {...cardReveal(0)}>
            <div className="inst-card">
              <Link href="/hermes" className="inst-card-fill" aria-label="Explore Hermes">
                <div className="inst-platter">
                  <div className="inst-card-render" aria-hidden="true">
                    <HermesLiquidityFieldRender posture={hermesTelemetry?.posture} />
                  </div>
                  <div className="inst-card-scrim" aria-hidden="true" />
                  <span className="inst-chip is-live">
                    {hermesTelemetry ? <span className="inst-chip-dot" aria-hidden="true" /> : null}
                    Live · {hermesBetaVersionLabel.replace(/^Hermes\s+/, '')}
                  </span>
                  {hermesTelemetry ? (
                    <p className="inst-card-live-brief">
                      <HermesLiveBriefing telemetry={hermesTelemetry} />
                    </p>
                  ) : null}
                </div>
              </Link>
              <div className="inst-copy">
                <Link href="/hermes" className="inst-card-name">
                  <em className="inst-card-kicker">The first instrument</em>
                  <strong>Hermes</strong>
                  <p>
                    A live capital allocation engine that reads market structure to decide when capital should
                    move, wait, or be preserved.
                  </p>
                </Link>
                <div className="inst-card-ctas">
                  <Link href="/hermes" className="inst-card-cta">
                    Explore →
                  </Link>
                  <Link href="/trust" className="inst-card-cta inst-card-cta-ledger">
                    Decision ledger →
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div id="oracle" className="inst-cell inst-cell-oracle scroll-mt-24" {...cardReveal(1)}>
            <Link href="/oracle" className="inst-card">
              <div className="inst-platter">
                <div className="inst-card-render" aria-hidden="true">
                  <OracleFuturesRender />
                </div>
                <div className="inst-card-scrim" aria-hidden="true" />
                <span className="inst-chip is-cal">Keeping score</span>
                <div className="inst-card-metrics">
                  <span>
                    <em>Resolved</em>
                    <strong>{calibration.resolved}</strong>
                  </span>
                  <span title="Forecast accuracy. Lower is better; 0.25 is a coin flip.">
                    <em>Brier</em>
                    <strong>{calibration.brier.toFixed(2)}</strong>
                  </span>
                  <span>
                    <em>As of</em>
                    <strong>{calibration.asOf}</strong>
                  </span>
                </div>
              </div>
              <div className="inst-copy">
                <div className="inst-card-name">
                  <strong>Oracle</strong>
                  <p>Live probability over real events, scored against what happened.</p>
                </div>
                <span className="inst-card-cta">Live record →</span>
              </div>
            </Link>
          </motion.div>

          <motion.div className="inst-cell inst-cell-sim" {...cardReveal(2)}>
            <Link href="/gates#simulation" className="inst-card">
              <div className="inst-platter">
                <div className="inst-card-render" aria-hidden="true">
                  <SimulationEnsembleRender />
                </div>
                <div className="inst-card-scrim" aria-hidden="true" />
                <span className="inst-chip is-idle">Building</span>
              </div>
              <div className="inst-copy">
                <div className="inst-card-name">
                  <strong>Simulation</strong>
                  <p>Synthetic environments where hypotheses fail quietly before deployment.</p>
                </div>
                <span className="inst-card-cta">Gate board →</span>
              </div>
            </Link>
          </motion.div>

          <motion.div className="inst-cell inst-cell-auto" {...cardReveal(3)}>
            <Link href="/gates#autonomy" className="inst-card inst-card-quiet">
              <div className="inst-platter">
                <span className="inst-chip is-idle">{autonomyGateHeadline}</span>
              </div>
              <div className="inst-copy">
                <div className="inst-card-name">
                  <strong>Autonomy</strong>
                  <p>
                    Read the structure, act, stand down: the same discipline, extended beyond markets.
                    Domains are earned, not declared.
                  </p>
                </div>
              </div>
            </Link>
          </motion.div>

          <motion.div className="inst-gates-strip" {...cardReveal(4)}>
            <Link href="/gates" className="inst-gates-strip-link" aria-label="View public gate board">
              <span>
                <strong>Simulation and Autonomy</strong> stay gated — conditions and progress are public
              </span>
              <span>{gateBoardHeadline} · Gate board →</span>
            </Link>
          </motion.div>
        </div>
      </section>

      <section id="ledger" className="home-vault-wrap px-5 md:px-10 scroll-mt-24">
        <motion.div className="home-vault mx-auto max-w-7xl" {...cardReveal(5)}>
          <Link href="/trust" className="home-vault-card" aria-label="Open the Hermes decision ledger">
            <div className="home-vault-copy">
              <p className="section-kicker">Public record</p>
              <h2>Decision ledger</h2>
              <p>
                Every Hermes decision gets a sealed row before the outcome is known. Process and integrity
                first — outcomes second. Founder capital only.
              </p>
            </div>
            <div className="home-vault-metrics" aria-label="Ledger process metrics">
              <div>
                <span>Sealed decisions</span>
                <strong>{ledgerVault.sealedDecisions}</strong>
              </div>
              <div>
                <span>Open paths</span>
                <strong>{ledgerVault.openPaths === null ? '—' : ledgerVault.openPaths}</strong>
              </div>
              <div>
                <span>Closed</span>
                <strong>{ledgerVault.closedPaths}</strong>
              </div>
              <div>
                <span>Backfilled</span>
                <strong>{ledgerVault.backfilled}</strong>
              </div>
            </div>
            <span className="home-vault-cta">Inspect the chain →</span>
          </Link>
        </motion.div>
      </section>
      </>
      ) : (
      <>
      <section id="hermes" className="hermes-section scroll-mt-24">
        <div className="hermes-product-bg" aria-hidden="true">
          <HermesLiquidityFieldRender />
        </div>
        <div className="hermes-product-shell relative z-10 mx-auto flex max-w-7xl flex-col justify-center px-5 py-24 md:px-8 md:py-28">
          <motion.div className="hermes-product-copy" {...sectionReveal}>
            <p className="section-kicker">The first instrument</p>
            <h2>Hermes is the first instrument.</h2>
            <p>
              Hermes is a live capital allocation engine that reads market structure to decide when capital should
              move, wait, or be preserved.
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
            <p>Live probability over real events, every prediction scored against what actually happened.</p>

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

      <section className="research-strip px-5 md:px-10">
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

      <section className="news-strip px-5 md:px-10">
        <motion.div
          className="news-strip-inner mx-auto max-w-7xl"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.15, margin: '0px 0px -6% 0px' }}
          variants={listStagger}
        >
          <motion.div className="news-strip-head" variants={listItem}>
            <h2>News</h2>
            <Link href="/news" className="text-link">
              All news
            </Link>
          </motion.div>
          <div className="news-grid">
            {newsItems.map((item) => (
              <motion.div key={item.slug} variants={listItem}>
                <Link href={`/news/${item.slug}`} className="news-item">
                  <NotePlate seed={item.slug} tint={item.tint} label={item.label} />
                  <span className="news-item-date">{newsDateFormat.format(new Date(item.date))}</span>
                  <span className="news-item-title">{item.title}</span>
                  <span className="news-item-dek">{item.dek}</span>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      <section id="faq" className="faq-strip scroll-mt-24 px-5 md:px-10">
        <motion.div
          className="faq-strip-inner mx-auto max-w-7xl"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.12, margin: '0px 0px -6% 0px' }}
          variants={listStagger}
        >
          <motion.div className="faq-strip-head" variants={listItem}>
            <p className="section-kicker">FAQ</p>
            <h2>What to know first.</h2>
          </motion.div>
          <div className="faq-list">
            {homepageQuestions.map((item) => (
              <motion.div key={item.question} variants={listItem}>
                <details className="faq-item">
                  <summary>{item.question}</summary>
                  <p>{item.answer}</p>
                </details>
              </motion.div>
            ))}
            <motion.div variants={listItem}>
              <details className="faq-item">
                <summary>Terms used across this site</summary>
                <dl className="glossary-list">
                  <div>
                    <dt>Instrument</dt>
                    <dd>A system Solace builds and operates, not a security or financial product.</dd>
                  </div>
                  <div>
                    <dt>Reading</dt>
                    <dd>Hermes&rsquo;s most recent assessment of market conditions.</dd>
                  </div>
                  <div>
                    <dt>Posture</dt>
                    <dd>How boldly capital is routed right now, from standing down to fully deployed.</dd>
                  </div>
                  <div>
                    <dt>Regime</dt>
                    <dd>The market&rsquo;s prevailing character. Hermes acts only while the regime stays in character.</dd>
                  </div>
                  <div>
                    <dt>Liquidity path</dt>
                    <dd>
                      Hermes&rsquo;s core abstraction: whether the field between here and a price destination can
                      carry price at all.
                    </dd>
                  </div>
                  <div>
                    <dt>Calibration · Brier score</dt>
                    <dd>How closely stated probabilities match reality. Lower is better; 0.25 is a coin flip.</dd>
                  </div>
                  <div>
                    <dt>Gate conditions</dt>
                    <dd>What has to clear before Solace moves past markets. Status is on the gate board.</dd>
                  </div>
                  <div>
                    <dt>Sealed row</dt>
                    <dd>
                      A ledger entry written before its outcome is known, then hashed and chained so it cannot be
                      quietly edited.
                    </dd>
                  </div>
                  <div>
                    <dt>Backfill</dt>
                    <dd>
                      A ledger row recorded after its outcome was already known. Labeled, never hidden; backfilled
                      rows do not claim the sealed-first guarantee.
                    </dd>
                  </div>
                </dl>
              </details>
            </motion.div>
          </div>
        </motion.div>
      </section>

      <footer className="site-footer px-5 pb-8 pt-10 md:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="theme-divide footer-grid pt-8">
            <div className="footer-brand">
              <p className="flex items-center gap-2.5 font-serif text-xl font-medium text-foreground">
                <Mark size={22} className="site-mark" />
                Solace
              </p>
              <p className="footer-brand-dek">
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
              <details className="footer-accordion">
                <summary className="footer-heading">Instruments</summary>
                <ul>
                  {footerSystems.map((system) => (
                    <li key={system.name} title={system.hint}>
                      {system.href ? (
                        <a href={system.href}>{system.name}</a>
                      ) : (
                        <span className="footer-static">{system.name}</span>
                      )}
                      <span className="footer-status">{system.status}</span>
                    </li>
                  ))}
                </ul>
              </details>
            </div>

            <div className="footer-col">
              <details className="footer-accordion">
                <summary className="footer-heading">Company</summary>
                <ul>
                  <li>
                    <Link href="/brief">Technical brief</Link>
                  </li>
                  <li>
                    <Link href="/research">Research</Link>
                  </li>
                  <li>
                    <Link href="/news">News</Link>
                  </li>
                  <li>
                    <Link href="/trust">Decision ledger</Link>
                  </li>
                  <li>
                    <Link href="/gates">Gate conditions</Link>
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
              </details>
            </div>

            <div className="footer-col">
              <details className="footer-accordion">
                <summary className="footer-heading">Socials</summary>
                <ul>
                  {footerSocials.map((social) => (
                    <li key={social.name}>
                      <a href={social.href} target="_blank" rel="noreferrer">
                        {social.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </details>
            </div>

            <div className="footer-col">
              <details className="footer-accordion">
                <summary className="footer-heading">Contact</summary>
                <ul>
                  {footerEmails.map((email) => (
                    <li key={email}>
                      <a href={`mailto:${email}`}>{email}</a>
                    </li>
                  ))}
                </ul>
              </details>
            </div>
          </div>

          <div className="theme-divide mt-8 flex flex-col gap-2 pt-4 md:flex-row md:items-center md:justify-between">
            <p className="footer-fineprint">© 2026 Solace. All rights reserved.</p>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '1rem' }}>
              <ThemeToggle />
              <p className="footer-fineprint" style={{ margin: 0 }}>
                Domains are earned
              </p>
            </span>
          </div>
        </div>
      </footer>
      </MotionConfig>
    </main>
  );
}
