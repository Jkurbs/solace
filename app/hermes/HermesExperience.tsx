'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'framer-motion';

import type { HermesBriefPosture, HermesBriefSnapshot } from '@/features/hermes-brief-snapshot/types';

import Mark from '../Mark';
import RequestAccessForm from './RequestAccessForm';

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

function formatConstantLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

const proofItems = [
  {
    kicker: 'Reads',
    value: 'Structure',
    text: 'Liquidity, timing, and regime become a single operating read.',
  },
  {
    kicker: 'Decides',
    value: 'Posture',
    text: 'Hermes compresses noisy market state into preserve, wait, reduce, or deploy.',
  },
  {
    kicker: 'Shows',
    value: 'Reason',
    text: 'Every public read includes the current action and the condition Hermes is waiting for.',
  },
];

const sceneSteps = [
  {
    kicker: 'Reads',
    title: 'The field, as one read.',
    text: 'Liquidity, regime, and candidate paths collapse into a single operating picture.',
  },
  {
    kicker: 'Decides',
    title: 'Preserve, wait, or deploy.',
    text: 'That picture compresses into one decision about where capital should sit, and why.',
  },
  {
    kicker: 'Shows',
    title: 'The engine, reasoning in the open.',
    text: 'Hermes streams what it evaluated and the exact condition it is still waiting for.',
  },
];

const featureSections = [
  {
    kicker: 'Built for uncertainty',
    title: 'The product is the instrument.',
    text:
      'Hermes is designed around oversight instead of manual control. You see what the system is reading, the posture it has chosen, and why capital is moving or staying preserved.',
    items: ['continuous evaluation', 'risk calibration', 'allocation decisions', 'emotional discipline'],
  },
  {
    kicker: 'Public-safe by design',
    title: 'Signals stay inside the engine.',
    text:
      'The page previews the Hermes experience without becoming a trade-signal surface. It exposes posture, paths, freshness, capital state, and reasoning while keeping raw execution private.',
    items: ['no entries', 'no targets', 'no balances', 'no pnl'],
  },
];

const impactItems = [
  'Users understand what Hermes is doing without parsing technical systems or raw operational detail.',
  'Posture, capital state, risk level, current action, and decision rationale are visible in one read.',
  'The public preview uses the same sanitized brief contract that powers public Hermes updates.',
  'Sensitive signals, exact trades, prices, balances, PnL, and user-specific data stay private.',
];

const fees = [
  {
    label: 'Deposits',
    value: 'Direct',
    note: 'Users deposit capital directly into Solace before Hermes allocates according to the selected profile.',
  },
  {
    label: 'Money movement',
    value: 'Visible',
    note: 'Deposits, withdrawals, current value, and available balance remain visible in the Solace dashboard.',
  },
  {
    label: 'Hermes access',
    value: 'Disclosed first',
    note: 'Access terms are provided before onboarding. No hidden spreads or interface upsells.',
  },
];

type Metric = { label: string; positive?: boolean; value: string };
type DecisionRow = { label: string; summary: string };
type CapitalVisual = { gradient: string; label: string };

export type HermesExperienceProps = {
  capitalVisual: CapitalVisual;
  dashboardPreview: HermesBriefSnapshot;
  dataAsOfLabel: string;
  decisionRows: DecisionRow[];
  pathMetrics: Metric[];
  postureOptions: HermesBriefPosture[];
  pulseTone?: string;
  statusMetrics: Metric[];
  updatedLabel: string;
};

type Focus = 'reads' | 'decides' | 'shows' | null;

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [query]);

  return matches;
}

function Reveal({
  children,
  className,
  delay = 0,
  y = 26,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-12% 0px -12% 0px' }}
      transition={{ duration: 0.8, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 130, damping: 30, mass: 0.3 });

  return <motion.div className="hx-progress" style={{ scaleX }} aria-hidden="true" />;
}

/* ---- Minimal inline icon set for the console mock ---- */
type GlyphName =
  | 'overview'
  | 'paths'
  | 'posture'
  | 'pulse'
  | 'liquidity'
  | 'regime'
  | 'timing'
  | 'search'
  | 'star'
  | 'link'
  | 'branch'
  | 'expand'
  | 'minimize'
  | 'close'
  | 'chevrons';

function Glyph({ name, className }: { name: GlyphName; className?: string }) {
  const base = {
    width: 14,
    height: 14,
    viewBox: '0 0 16 16',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.4,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    'aria-hidden': true,
  };

  switch (name) {
    case 'overview':
      return (
        <svg {...base}>
          <rect x="2.5" y="2.5" width="4.5" height="4.5" rx="1" />
          <rect x="9" y="2.5" width="4.5" height="4.5" rx="1" />
          <rect x="2.5" y="9" width="4.5" height="4.5" rx="1" />
          <rect x="9" y="9" width="4.5" height="4.5" rx="1" />
        </svg>
      );
    case 'paths':
      return (
        <svg {...base}>
          <circle cx="4" cy="4" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <path d="M4 5.8v2A4 4 0 0 0 8 12h2" />
        </svg>
      );
    case 'posture':
      return (
        <svg {...base}>
          <path d="M2 12a6 6 0 0 1 12 0" />
          <path d="M8 12l3-3.2" />
        </svg>
      );
    case 'pulse':
      return (
        <svg {...base}>
          <path d="M1.5 8h3l1.8-4 2.6 8 1.8-4h3.8" />
        </svg>
      );
    case 'liquidity':
      return (
        <svg {...base}>
          <path d="M2 6c1.5 1.4 3 1.4 4.5 0S9.5 4.6 11 6s3 1.4 4.5 0" />
          <path d="M2 10c1.5 1.4 3 1.4 4.5 0S9.5 8.6 11 10s3 1.4 4.5 0" />
        </svg>
      );
    case 'regime':
      return (
        <svg {...base}>
          <circle cx="8" cy="8" r="5.5" />
          <path d="M3 9.5c2-2 3-2 5 0s3 2 5 0" />
        </svg>
      );
    case 'timing':
      return (
        <svg {...base}>
          <circle cx="8" cy="8" r="5.5" />
          <path d="M8 5v3l2 1.4" />
        </svg>
      );
    case 'search':
      return (
        <svg {...base}>
          <circle cx="7" cy="7" r="4" />
          <path d="M10 10l3.5 3.5" />
        </svg>
      );
    case 'star':
      return (
        <svg {...base} fill="currentColor" stroke="none">
          <path d="M8 1.8l1.8 3.7 4.1.6-3 2.9.7 4.1L8 12.2 4.3 14.1l.7-4.1-3-2.9 4.1-.6z" />
        </svg>
      );
    case 'link':
      return (
        <svg {...base}>
          <path d="M6.5 9.5l3-3" />
          <path d="M7 4.6l1-1a2.5 2.5 0 0 1 3.5 3.5l-1 1" />
          <path d="M9 11.4l-1 1A2.5 2.5 0 0 1 4.5 8.9l1-1" />
        </svg>
      );
    case 'branch':
      return (
        <svg {...base}>
          <circle cx="4.5" cy="4" r="1.5" />
          <circle cx="4.5" cy="12" r="1.5" />
          <circle cx="11.5" cy="4" r="1.5" />
          <path d="M4.5 5.5v5M11.5 5.5v1.4a3 3 0 0 1-3 3H6" />
        </svg>
      );
    case 'expand':
      return (
        <svg {...base}>
          <path d="M9 3h4v4M13 3l-4 4M7 13H3V9M3 13l4-4" />
        </svg>
      );
    case 'minimize':
      return (
        <svg {...base}>
          <path d="M3.5 8h9" />
        </svg>
      );
    case 'close':
      return (
        <svg {...base}>
          <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" />
        </svg>
      );
    case 'chevrons':
      return (
        <svg {...base}>
          <path d="M5 6.5L8 4l3 2.5M5 9.5l3 2.5 3-2.5" />
        </svg>
      );
    default:
      return null;
  }
}

/* ---- The Hermes console: a believable, public-safe product mock ---- */
function HermesConsole({
  dashboardPreview,
  capitalVisual,
  focus,
}: {
  dashboardPreview: HermesBriefSnapshot;
  capitalVisual: CapitalVisual;
  focus: Focus;
}) {
  const posture = formatConstantLabel(dashboardPreview.posture);
  const capital = formatConstantLabel(dashboardPreview.risk.capital_state);
  const capitalLower = capital.toLowerCase();
  const risk = formatConstantLabel(dashboardPreview.risk.risk_level);
  const action = formatConstantLabel(dashboardPreview.actions.current_action);
  const liquidity = formatConstantLabel(dashboardPreview.market_regime.liquidity);
  const volatility = formatConstantLabel(dashboardPreview.market_regime.volatility);
  const underReview = dashboardPreview.paths.under_review;
  const deployed = dashboardPreview.paths.deployed;
  const invalidated = dashboardPreview.paths.invalidated_since_last;
  const otherEvaluated = Math.max(0, underReview - 2);

  const sidebarPaths = [
    { code: 'PATH-2703', active: true },
    { code: 'PATH-2588', active: false },
    { code: 'PATH-2461', active: false },
  ];

  const activity = [
    { tone: 'engine', strong: 'Hermes', rest: ' opened read via engine', time: '2m' },
    { tone: 'risk', strong: 'Risk', rest: ' flagged Elevated-spread', time: '2m' },
    { tone: 'path', strong: 'PATH-2461', rest: ' invalidated — timing failed confirmation', time: '4m' },
    { tone: 'regime', strong: 'Regime', rest: ` updated → ${dashboardPreview.market_regime.label}`, time: 'now' },
  ];

  const properties: Array<{ label: string; value: string; tone?: 'pos' | 'amber' | 'cool' }> = [
    { label: 'Posture', value: posture, tone: dashboardPreview.posture === 'DEPLOYED' ? 'pos' : 'amber' },
    { label: 'Risk', value: risk, tone: 'cool' },
    { label: 'Capital', value: capital, tone: 'cool' },
    { label: 'Action', value: action, tone: 'amber' },
  ];

  const engineLines = [
    'PATH-2703 · timing weak',
    'PATH-2588 · spread wide',
    `${otherEvaluated} more evaluated`,
  ];

  return (
    <div className="hxd" data-focus={focus ?? undefined} aria-label="Hermes console preview">
      <div className="hxd-bar">
        <div className="hxd-bar-left">
          <span className="hxd-brand">
            <Mark size={15} />
            Hermes
            <i className="hxd-caret" aria-hidden="true" />
          </span>
          <span className="hxd-iconbtn">
            <Glyph name="search" />
          </span>
        </div>
        <div className="hxd-bar-center">
          <span>Read 01 / {String(underReview).padStart(2, '0')}</span>
          <Glyph name="chevrons" className="hxd-dim" />
        </div>
        <div className="hxd-bar-right">
          <span className="hxd-pathid">PATH-2703</span>
          <Glyph name="link" className="hxd-dim" />
          <Glyph name="branch" className="hxd-dim" />
        </div>
      </div>

      <div className="hxd-body">
        <aside className="hxd-side hxd-region is-reads">
          <nav className="hxd-nav">
            <span className="hxd-nav-item is-active">
              <Glyph name="overview" />
              Overview
            </span>
            <span className="hxd-nav-item">
              <Glyph name="paths" />
              Paths
            </span>
            <span className="hxd-nav-item">
              <Glyph name="posture" />
              Posture
            </span>
            <span className="hxd-nav-item">
              <Glyph name="pulse" />
              Pulse
            </span>
          </nav>

          <p className="hxd-side-head">Markets</p>
          <nav className="hxd-nav">
            <span className="hxd-nav-item">
              <Glyph name="liquidity" />
              Liquidity
            </span>
            <span className="hxd-nav-item">
              <Glyph name="regime" />
              Regime
            </span>
            <span className="hxd-nav-item">
              <Glyph name="timing" />
              Timing
            </span>
          </nav>

          <p className="hxd-side-head">Paths under review</p>
          <nav className="hxd-nav">
            {sidebarPaths.map((path) => (
              <span key={path.code} className={`hxd-nav-item${path.active ? ' is-active' : ''}`}>
                <span className="hxd-pathdot" />
                {path.code}
              </span>
            ))}
            <span className="hxd-nav-item hxd-dim">
              <span className="hxd-pathdot is-muted" />
              Watchlist
            </span>
          </nav>
        </aside>

        <main className="hxd-center hxd-region is-reads">
          <div className="hxd-read-head">
            <Glyph name="star" className="hxd-star" />
            <h4>
              {posture} — capital {capitalLower}
            </h4>
          </div>
          <p className="hxd-read-desc">
            Hermes is tracking {underReview} candidate paths. Liquidity is{' '}
            <span className="hxd-token">{liquidity}</span>, volatility{' '}
            <span className="hxd-token">{volatility}</span>; none have earned deployment.
          </p>

          <p className="hxd-activity-head">Activity</p>
          <ul className="hxd-activity">
            {activity.map((item) => (
              <li key={item.strong + item.rest} className={`hxd-act hxd-act-${item.tone}`}>
                <span className="hxd-act-dot" />
                <span className="hxd-act-text">
                  <strong>{item.strong}</strong>
                  {item.rest}
                </span>
                <span className="hxd-act-time">{item.time}</span>
              </li>
            ))}
          </ul>
        </main>

        <aside className="hxd-rail hxd-region is-decides">
          <p className="hxd-rail-head">Properties</p>
          {properties.map((prop) => (
            <div key={prop.label} className="hxd-prop">
              <span>{prop.label}</span>
              <strong className={prop.tone ? `hxd-tone-${prop.tone}` : undefined}>
                <span className="hxd-prop-dot" />
                {prop.value}
              </strong>
            </div>
          ))}

          <div className="hxd-next">
            <span>Next condition</span>
            <p>{dashboardPreview.actions.next_condition}</p>
          </div>

          <div className="hxd-capital">
            <span className="hxd-donut" style={{ background: capitalVisual.gradient }} aria-hidden="true" />
            <div>
              <strong>{capitalVisual.label}</strong>
              <em>
                {deployed} deployed · {invalidated} invalidated
              </em>
            </div>
          </div>
        </aside>
      </div>

      <div className="hxd-engine hxd-region is-shows" aria-label="Hermes engine">
        <div className="hxd-engine-bar">
          <span className="hxd-engine-title">
            <Mark size={13} />
            Hermes <em>Engine</em>
          </span>
          <span className="hxd-engine-ctrls">
            <Glyph name="minimize" className="hxd-dim" />
            <Glyph name="expand" className="hxd-dim" />
            <Glyph name="close" className="hxd-dim" />
          </span>
        </div>
        <div className="hxd-engine-body">
          <p className="hxd-engine-status">
            <span className="hxd-engine-pulse" />
            Scanning liquidity across {underReview} paths…
          </p>
          <p className="hxd-engine-worked">Worked for 7s ▾</p>
          <ul className="hxd-engine-lines">
            {engineLines.map((line, index) => (
              <li key={line} style={{ transitionDelay: `${0.12 + index * 0.09}s` }}>
                {line}
              </li>
            ))}
          </ul>
          <div className="hxd-engine-result">
            <span>Result</span>
            <strong>
              {deployed} deployed → capital {capitalLower}
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
}

function PinnedDashboard(props: HermesExperienceProps) {
  const reduce = useReducedMotion();
  const isCompact = useMediaQuery('(max-width: 860px)');
  const ref = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });

  const scale = useTransform(scrollYProgress, [0, 0.2, 1], [0.9, 1, 1.03]);
  const rotateX = useTransform(scrollYProgress, [0, 0.2], [8, 0]);
  const lift = useTransform(scrollYProgress, [0, 0.2], [64, 0]);

  const [step, setStep] = useState(0);
  useMotionValueEvent(scrollYProgress, 'change', (value) => {
    setStep(value < 0.4 ? 0 : value < 0.7 ? 1 : 2);
  });

  const focus = (['reads', 'decides', 'shows'] as const)[step];

  if (reduce || isCompact) {
    return (
      <section className="hx-shell hx-pin-static">
        <div className="hx-pin-steps">
          {sceneSteps.map((item) => (
            <div key={item.title} className="hx-pin-step is-active">
              <span>{item.kicker}</span>
              <strong>{item.title}</strong>
              <p>{item.text}</p>
            </div>
          ))}
        </div>
        <div className="hx-pin-static-frame">
          <HermesConsole dashboardPreview={props.dashboardPreview} capitalVisual={props.capitalVisual} focus={null} />
        </div>
      </section>
    );
  }

  return (
    <section ref={ref} className="hx-pin">
      <div className="hx-pin-sticky">
        <div className="hx-pin-glow" aria-hidden="true" />
        <div className="hx-pin-inner">
          <div className="hx-pin-steps">
            {sceneSteps.map((item, index) => (
              <div key={item.title} className={`hx-pin-step${index === step ? ' is-active' : ''}`}>
                <span>{item.kicker}</span>
                <strong>{item.title}</strong>
                <p>{item.text}</p>
              </div>
            ))}
          </div>
          <div className="hx-pin-stage">
            <motion.div className="hx-pin-frame" style={{ scale, rotateX, y: lift, transformPerspective: 1600 }}>
              <HermesConsole dashboardPreview={props.dashboardPreview} capitalVisual={props.capitalVisual} focus={focus} />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function HermesExperience(props: HermesExperienceProps) {
  return (
    <main className="hx-page">
      <ScrollProgress />

      <header className="hx-header">
        <div className="hx-header-inner">
          <Link href="/" className="hx-brand">
            <Mark size={20} />
            Solace
          </Link>
          <a href="#request-access" className="hx-btn hx-btn-primary hx-btn-sm">
            Request Hermes
          </a>
        </div>
      </header>

      <section className="hx-hero">
        <div className="hx-hero-glow" aria-hidden="true" />
        <Reveal>
          <p className="section-kicker">Hermes by Solace</p>
        </Reveal>
        <Reveal delay={0.06}>
          <h1 className="hx-hero-title">Hermes</h1>
        </Reveal>
        <Reveal delay={0.12}>
          <p className="hx-hero-lede">
            A live capital allocation instrument for markets under uncertainty. Hermes reads liquidity, timing,
            and regime to decide when capital should move, wait, or be preserved.
          </p>
        </Reveal>
        <Reveal delay={0.18}>
          <div className="hx-hero-actions">
            <a href="#request-access" className="hx-btn hx-btn-primary">
              Request Access
            </a>
            <Link href="/brief" className="hx-btn hx-btn-secondary">
              Read brief
            </Link>
          </div>
        </Reveal>
        <Reveal delay={0.28}>
          <div className="hx-scrollcue">
            <span>Scroll</span>
            <span className="hx-scrollcue-rail" aria-hidden="true" />
          </div>
        </Reveal>
      </section>

      <section className="hx-shell">
        <div className="hx-proof">
          {proofItems.map((item, index) => (
            <Reveal key={item.kicker} className="hx-proof-card" delay={index * 0.08}>
              <span className="hx-proof-kicker">{item.kicker}</span>
              <strong className="hx-proof-value">{item.value}</strong>
              <p className="hx-proof-text">{item.text}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <PinnedDashboard {...props} />

      <section className="hx-shell">
        {featureSections.map((section, index) => (
          <div key={section.kicker} className={`hx-feature${index % 2 === 1 ? ' hx-feature-right' : ''}`}>
            <Reveal className="hx-feature-copy">
              <p className="section-kicker">{section.kicker}</p>
              <h2>{section.title}</h2>
              <p>{section.text}</p>
            </Reveal>
            <Reveal className="hx-feature-visual" delay={0.1}>
              <div className="hx-chip-grid">
                {section.items.map((item) => (
                  <span key={item} className="hx-chip">
                    <i aria-hidden="true" />
                    {item}
                  </span>
                ))}
              </div>
            </Reveal>
          </div>
        ))}
      </section>

      <section className="hx-shell">
        <div className="hx-quote">
          <Reveal>
            <p className="section-kicker">In one line</p>
          </Reveal>
          <Reveal delay={0.08}>
            <blockquote>
              The product should feel like checking on a professional allocator, not managing the account
              yourself.
            </blockquote>
          </Reveal>
        </div>
      </section>

      <section className="hx-shell">
        <div className="hx-impact">
          <Reveal className="hx-feature-copy">
            <p className="section-kicker">Impact</p>
            <h2>A dashboard for oversight, not intervention.</h2>
          </Reveal>
          <Reveal delay={0.08}>
            <ol className="hx-impact-list">
              {impactItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          </Reveal>
        </div>
      </section>

      <section className="hx-shell">
        <div className="hx-access">
          <Reveal className="hx-feature-copy">
            <p className="section-kicker">Access model</p>
            <h2>Simple terms before capital moves.</h2>
            <p>
              Hermes is not designed around spreads, gimmicks, or hidden complexity. Access terms are disclosed
              before onboarding, users deposit directly into Solace, and account movement stays visible in the
              dashboard.
            </p>
          </Reveal>
          <div className="hx-fees">
            {fees.map((fee, index) => (
              <Reveal key={fee.label} className="hx-fee" delay={index * 0.07}>
                <div className="hx-fee-row">
                  <span>{fee.label}</span>
                  <strong>{fee.value}</strong>
                </div>
                <p>{fee.note}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="request-access" className="hx-shell hx-form scroll-mt-28">
        <Reveal className="hx-form-head">
          <p className="section-kicker">Request access</p>
          <Link href="/brief" className="text-link">
            Read the technical brief
          </Link>
        </Reveal>
        <RequestAccessForm />
      </section>

      <section className="hx-shell">
        <div className="hx-foot">
          <p>Hermes · The first instrument · Live</p>
          <Link href="/" className="text-link">
            Return home
          </Link>
        </div>
      </section>
    </main>
  );
}
