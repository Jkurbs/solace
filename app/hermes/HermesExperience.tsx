'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';

import SiteFooter from '@/components/site-footer';
import SiteHeader from '@/components/site-header';
import { OBSERVATORY_HERMES_LEDGER_PATH } from '@/features/observatory/paths';
import { DOCS_API_URL } from '@/lib/docs';

import { ExperienceHermesButton, HermesOnboardingProvider } from './HermesOnboarding';

export type HermesTimelineEntry = {
  action: string;
  time: string;
  detail: string;
  outcome: string;
  resolved: boolean;
};

export type HermesProof = {
  posture: string | null;
  postureAge: string | null;
  sealedDecisions: number;
  openPaths: number | null;
  closedPaths: number;
  hermesLabel: string;
  hermesVersionId: string;
  liveUnrealizedPnl: number | null;
  expectancy: number | null;
  hitRateLabel: string;
  sampleSize: number;
  positive: number;
  negative: number;
  standDownRateLabel: string;
  timeline: HermesTimelineEntry[];
};

const easeOut = [0.16, 1, 0.3, 1] as [number, number, number, number];

const fade = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: easeOut } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.06 } },
};

const features = [
  {
    num: '01',
    title: 'Measures market structure',
    desc: 'Hermes continuously reads liquidity depth, volatility compression, and positioning to assess whether conditions favor capital deployment.',
    visual: 'structure' as const,
  },
  {
    num: '02',
    title: 'Finds the edge',
    desc: 'Not every calm market is an opportunity. Hermes calculates whether the current setup offers asymmetric reward relative to risk.',
    visual: 'edge' as const,
  },
  {
    num: '03',
    title: 'Sizes with discipline',
    desc: 'When the edge is sufficient, Hermes decides position size, entry, and invalidation level, all before any capital moves.',
    visual: 'size' as const,
  },
  {
    num: '04',
    title: 'Logs before it acts',
    desc: 'Every decision is timestamped and sealed in the public ledger. The record cannot be edited after the fact.',
    visual: 'log' as const,
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
    a: 'Hermes does not manage outside capital today. It does not charge fees. It executes, logs every decision in a sealed public record, and lets the track record speak for itself.',
  },
  {
    q: 'Can I see the exact trades?',
    a: 'You can inspect sealed decisions, outcomes, and process on the public ledger. Execution detail that would reveal the recipe stays private. The chain is still checkable by math.',
  },
] as const;

const pnlFormatter = new Intl.NumberFormat('en-US', {
  currency: 'USD',
  maximumFractionDigits: 0,
  signDisplay: 'always',
  style: 'currency',
});

function PhoneMock() {
  return (
    <div className="hmk-phone" aria-hidden="true">
      <div className="hmk-phone-bezel">
        <div className="hmk-phone-screen">
          <div className="hmk-phone-bar">
            <span>Solace</span>
            <em>Simulation</em>
          </div>
          <div className="hmk-phone-body">
            <span className="hmk-phone-label">Simulated allocation</span>
            <strong className="hmk-phone-value">$50,897</strong>
            <span className="hmk-phone-delta is-pos">+$19,692 (+63.1%)</span>
            <div className="hmk-phone-rows">
              <div>
                <span>In strategy</span>
                <strong>$50,406</strong>
              </div>
              <div>
                <span>Unallocated</span>
                <strong>$490</strong>
              </div>
              <div>
                <span>Positions</span>
                <strong>5 open</strong>
              </div>
            </div>
            <div className="hmk-phone-cta">Join the waitlist</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureVisual({ kind }: { kind: (typeof features)[number]['visual'] }) {
  if (kind === 'structure') {
    return (
      <div className="hmk-viz hmk-viz-bars" aria-hidden="true">
        <div className="hmk-viz-bars-track">
          {[40, 55, 35, 70, 45, 85, 30, 75, 50, 90, 40, 65].map((h, i) => (
            <i
              key={i}
              style={{ height: `${h}%` }}
              className={i === 5 || i === 9 ? 'is-hot' : i === 6 ? 'is-warn' : undefined}
            />
          ))}
        </div>
        <span>Live market structure read</span>
      </div>
    );
  }
  if (kind === 'edge') {
    return (
      <div className="hmk-viz hmk-viz-edge" aria-hidden="true">
        <div>
          <strong>3.2%</strong>
          <em>Market implied</em>
        </div>
        <span className="hmk-viz-arrow">→</span>
        <div>
          <strong className="is-pos">8.7%</strong>
          <em>Hermes reads</em>
        </div>
        <span className="hmk-viz-caption">Edge detection: risk vs reward</span>
      </div>
    );
  }
  if (kind === 'size') {
    return (
      <div className="hmk-viz hmk-viz-size" aria-hidden="true">
        {[
          { label: '2.1% sizing', w: 72 },
          { label: '1.5% sizing', w: 52 },
          { label: '1.8% sizing', w: 62 },
        ].map((row) => (
          <div key={row.label} className="hmk-viz-size-row">
            <i style={{ width: `${row.w}%` }} />
            <span>{row.label}</span>
          </div>
        ))}
        <span className="hmk-viz-caption">Position sizing by conviction</span>
      </div>
    );
  }
  return (
    <div className="hmk-viz hmk-viz-log" aria-hidden="true">
      {[
        { name: 'BTC long', pnl: '+$2,142', pos: true },
        { name: 'ETH/BTC spread', pnl: '+$1,890', pos: true },
        { name: '2s10s curve', pnl: '−$612', pos: false },
        { name: 'Volatility long', pnl: '+$3,050', pos: true },
      ].map((row) => (
        <div key={row.name} className="hmk-viz-log-row">
          <span>{row.name}</span>
          <strong className={row.pos ? 'is-pos' : 'is-neg'}>{row.pnl}</strong>
        </div>
      ))}
      <span className="hmk-viz-caption">Sealed public ledger</span>
    </div>
  );
}

export default function HermesExperience({ proof }: { proof: HermesProof }) {
  const reduceMotion = useReducedMotion();
  const heroInitial = reduceMotion ? false : 'hidden';

  const openLabel = proof.openPaths === null ? '—' : String(proof.openPaths);
  const livePnl =
    proof.liveUnrealizedPnl === null ? null : pnlFormatter.format(proof.liveUnrealizedPnl);
  const liveTone =
    proof.liveUnrealizedPnl === null
      ? undefined
      : proof.liveUnrealizedPnl > 0
        ? 'is-pos'
        : proof.liveUnrealizedPnl < 0
          ? 'is-neg'
          : undefined;

  const timeline =
    proof.timeline.length > 0
      ? proof.timeline.slice(0, 5)
      : [
          {
            action: 'First sealed decisions appear here',
            time: 'Pending',
            detail: 'The public chain is live. Newest sealed rows surface on this strip.',
            outcome: 'Awaiting activity',
            resolved: false,
          },
        ];

  return (
    <HermesOnboardingProvider>
    <main className="hmk pt-16">
      <SiteHeader />

      {/* Hero */}
      <section className="hmk-hero">
        <motion.div
          className="hmk-hero-card"
          initial={heroInitial}
          animate="show"
          variants={stagger}
        >
          <motion.div variants={fade} className="hmk-badge">
            <i />
            HERMES BETA V{proof.hermesVersionId} · LIVE
          </motion.div>
          <motion.h1 variants={fade} className="hmk-hero-title">
            Capital that decides
            <br />
            for itself.
          </motion.h1>
          <motion.p variants={fade} className="hmk-hero-lede">
            Hermes reads market structure (liquidity, volatility, regime, risk) and decides whether
            to allocate capital, how much, and when to exit. Every decision is logged before it moves.
          </motion.p>
          <motion.div variants={fade} className="hmk-hero-actions">
            <ExperienceHermesButton className="hmk-btn hmk-btn-dark">
              Experience Hermes
              <span aria-hidden="true">→</span>
            </ExperienceHermesButton>
            <a
              href={DOCS_API_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hmk-btn hmk-btn-light hmk-btn-api"
            >
              API docs
            </a>
          </motion.div>
          <motion.div variants={fade} className="hmk-hero-phone">
            <PhoneMock />
          </motion.div>
        </motion.div>
      </section>
      {/* Record metrics */}
      <section className="hmk-section hmk-metrics-section">
        <div className="hmk-shell hmk-center">
          <h2 className="hmk-section-title">A record you can inspect.</h2>
          <p className="hmk-section-dek">
            Every position, entry, and exit is sealed publicly before the outcome.
          </p>
          <div className="hmk-metrics">
            <div>
              <strong className={liveTone ?? 'is-pos'}>
                {livePnl ?? (proof.expectancy !== null ? pnlFormatter.format(proof.expectancy) : '—')}
              </strong>
              <span>{livePnl ? 'live open PnL' : 'mean sealed close'}</span>
            </div>
            <div>
              <strong>{proof.sealedDecisions || '—'}</strong>
              <span>sealed decisions</span>
            </div>
            <div>
              <strong>{proof.closedPaths || '—'}</strong>
              <span>positions closed</span>
            </div>
            <div>
              <strong className="is-pos">{proof.hitRateLabel !== '-' ? proof.hitRateLabel : '—'}</strong>
              <span>directional hit rate</span>
            </div>
          </div>
          <p className="hmk-metrics-note">
            Founder capital · young sample n={proof.sampleSize} · {openLabel} open paths ·{' '}
            {proof.standDownRateLabel} standing down
            {proof.posture ? ` · ${proof.posture}` : ''}
            {proof.postureAge ? ` · ${proof.postureAge}` : ''}
          </p>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="hmk-section hmk-features-section scroll-mt-24">
        <div className="hmk-shell">
          <div className="hmk-features">
            {features.map((feature) => (
              <article key={feature.num} className="hmk-feature">
                <div className="hmk-feature-copy">
                  <span className="hmk-feature-num">{feature.num}</span>
                  <h3>{feature.title}</h3>
                  <p>{feature.desc}</p>
                </div>
                <FeatureVisual kind={feature.visual} />
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Decision ledger timeline */}
      <section id="ledger" className="hmk-section hmk-ledger-section scroll-mt-24">
        <div className="hmk-shell hmk-center">
          <h2 className="hmk-section-title">The decision ledger</h2>
          <p className="hmk-section-dek">
            Every move Hermes makes is recorded publicly before the outcome is known. No revisions. No
            backtests. Just a timeline you can follow.
          </p>

          <div className="hmk-ledger-card">
            <ul className="hmk-ledger-list">
              {timeline.map((entry) => (
                <li key={`${entry.time}-${entry.action}`} className={entry.resolved ? 'is-resolved' : 'is-open'}>
                  <span className="hmk-ledger-dot" aria-hidden="true" />
                  <div className="hmk-ledger-body">
                    <div className="hmk-ledger-top">
                      <strong>{entry.action}</strong>
                      <time>{entry.time}</time>
                    </div>
                    <p>{entry.detail}</p>
                    <div className="hmk-ledger-tags">
                      <span className="hmk-tag is-seal">Sealed before execution</span>
                      <span className={`hmk-tag ${entry.resolved ? 'is-done' : 'is-wait'}`}>
                        {entry.outcome}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="hmk-ledger-legend">
              <span>
                <i className="is-resolved" /> Sealed & resolved
              </span>
              <span>
                <i className="is-open" /> Sealed · awaiting outcome
              </span>
            </div>
          </div>

          <Link href={OBSERVATORY_HERMES_LEDGER_PATH} className="hmk-btn hmk-btn-light hmk-btn-ghost">
            Inspect the chain
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      {/* Transparency */}
      <section className="hmk-section">
        <div className="hmk-shell hmk-center">
          <h2 className="hmk-section-title">Protected by transparency.</h2>
          <p className="hmk-section-dek">No black box. No backtests. Just a record you can check.</p>
          <div className="hmk-trust-grid">
            <article>
              <span className="hmk-trust-icon" aria-hidden="true">
                ⌁
              </span>
              <strong>Sealed before action</strong>
              <p>Every decision is logged publicly before capital moves. No revisions.</p>
            </article>
            <article>
              <span className="hmk-trust-icon" aria-hidden="true">
                ◇
              </span>
              <strong>Signal-linked</strong>
              <p>Every position traces back to market conditions that triggered it.</p>
            </article>
            <article>
              <span className="hmk-trust-icon" aria-hidden="true">
                ◯
              </span>
              <strong>Fully inspectable</strong>
              <p>The Observatory chain is public. Process, outcomes, and sealed waits.</p>
            </article>
          </div>
        </div>
      </section>

      {/* Simulation CTA */}
      <section className="hmk-section">
        <div className="hmk-shell">
          <div className="hmk-sim-card">
            <h2>Experience Hermes with simulated capital.</h2>
            <p>
              Track Hermes&apos;s real decision loop with simulated money. Real markets, zero financial risk.
              See how the system behaves before allocating real capital.
            </p>
            <ExperienceHermesButton className="hmk-btn hmk-btn-light">
              Start simulation
              <span aria-hidden="true">→</span>
            </ExperienceHermesButton>
            <p className="hmk-sim-note">Real capital allocation coming soon. Join the waitlist to be first.</p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="hmk-section hmk-faq-section">
        <div className="hmk-shell">
          <h2 className="hmk-faq-heading">What this is</h2>
          <dl className="hmk-faq">
            {faqItems.map((item) => (
              <div key={item.q}>
                <dt>{item.q}</dt>
                <dd>{item.a}</dd>
              </div>
            ))}
          </dl>
          <p className="hmk-disclaimer">
            Hermes operates on founder capital. Nothing here is an offer to manage funds, provide investment
            advice, or sell automated trading services. Young sample. A record, not a claim.
          </p>
        </div>
      </section>

      <SiteFooter />
    </main>
    </HermesOnboardingProvider>
  );
}
