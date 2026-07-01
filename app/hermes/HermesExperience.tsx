'use client';

import Link from 'next/link';
import type { MotionValue } from 'framer-motion';
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
import HermesBoardArt, { HermesBoardMobileArt, type HermesBoardFocus } from './HermesBoardArt';
import RequestAccessForm from './RequestAccessForm';

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

const sceneSteps = [
  {
    kicker: 'Reads',
    title: 'The current read.',
    text: 'Outlook, regime, and next condition stay compressed into one view.',
    focus: 'outlook',
  },
  {
    kicker: 'Waits',
    title: 'Waiting is a position.',
    text: 'Posture, risk, and conviction make restraint visible before capital moves.',
    focus: 'posture',
  },
  {
    kicker: 'Allocates',
    title: 'Capital state, visible.',
    text: 'The account shows what is preserved, what is deployed, and why.',
    focus: 'capital',
  },
  {
    kicker: 'Explains',
    title: 'Every decision leaves a trail.',
    text: 'Recent activity keeps the system legible without exposing trade signals.',
    focus: 'decisions',
  },
] satisfies Array<{
  kicker: string;
  title: string;
  text: string;
  focus: HermesBoardFocus;
}>;

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

function LiveReadoutBand({
  capitalVisual,
  dashboardPreview,
  dataAsOfLabel,
  pulseTone,
  updatedLabel,
}: {
  capitalVisual: CapitalVisual;
  dashboardPreview: HermesBriefSnapshot;
  dataAsOfLabel: string;
  pulseTone?: string;
  updatedLabel: string;
}) {
  const readout = [
    {
      label: 'Paths',
      subtext: 'under review',
      value: dashboardPreview.paths.under_review.toString(),
    },
    {
      label: 'Posture',
      subtext: dashboardPreview.posture_reason,
      value: dashboardPreview.posture,
    },
    {
      label: 'Pulse',
      subtext: updatedLabel,
      value: dashboardPreview.pulse,
    },
    {
      label: 'Capital',
      subtext: dashboardPreview.risk.reason,
      value: capitalVisual.label,
    },
  ];

  return (
    <section className="hx-shell hx-live-shell" aria-label="Hermes live readout">
      <Reveal className="hx-live-panel">
        <div className="hx-live-head">
          <span className={`hx-live-dot ${pulseTone ?? ''}`} aria-hidden="true" />
          <div>
            <p className="section-kicker">Live readout</p>
            <strong>{dashboardPreview.summary}</strong>
          </div>
          <span className="hx-live-asof">{dataAsOfLabel}</span>
        </div>
        <div className="hx-live-grid">
          {readout.map((item) => (
            <div key={item.label} className="hx-live-card">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <p>{item.subtext}</p>
            </div>
          ))}
        </div>
        <p className="hx-live-disclosure">{dashboardPreview.disclosure}</p>
      </Reveal>
    </section>
  );
}

function StepRow({ activeStep }: { activeStep: number | 'all' }) {
  return (
    <div className="hx-reveal-steps">
      {sceneSteps.map((item, index) => (
        <div
          key={item.title}
          className={`hx-pin-step${activeStep === 'all' || activeStep === index ? ' is-active' : ''}`}
        >
          <span>{item.kicker}</span>
          <strong>{item.title}</strong>
          <p>{item.text}</p>
        </div>
      ))}
    </div>
  );
}

function DashboardWindow({
  animateCompact = false,
  compact = false,
  focus,
  pan,
}: {
  animateCompact?: boolean;
  compact?: boolean;
  focus?: HermesBoardFocus;
  pan?: MotionValue<string>;
}) {
  return (
    <div className={`hx-window${compact ? ' hx-window-mobile' : ''}`}>
      <div className="hx-window-bar">
        <span className="hx-window-dots">
          <i />
          <i />
          <i />
        </span>
        <span className="hx-window-url">app.solace.fyi/dashboard · Live</span>
        <span className="hx-window-spacer" />
      </div>
      <div className={`hx-window-view${pan ? '' : ' is-static'}${compact ? ' is-mobile' : ''}`}>
        {compact ? (
          <div className={`hxm-board-track${animateCompact ? ' is-animated' : ''}`}>
            <HermesBoardMobileArt />
          </div>
        ) : pan ? (
          <motion.div className="hx-board-pan" style={{ y: pan }}>
            <HermesBoardArt focus={focus} />
          </motion.div>
        ) : (
          <div className="hx-board-pan">
            <HermesBoardArt focus={focus} />
          </div>
        )}
      </div>
    </div>
  );
}

function DashboardReveal() {
  const reduce = useReducedMotion();
  const isCompact = useMediaQuery('(max-width: 860px)');
  const ref = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });

  // Cinematic entry: the dashboard fades, scales, and tilts up into place,
  // then slowly pans through its sections as the captions advance.
  const opacity = useTransform(scrollYProgress, [0, 0.08], [0.72, 1]);
  const scale = useTransform(scrollYProgress, [0, 0.16], [0.94, 1]);
  const rotateX = useTransform(scrollYProgress, [0, 0.16], [7, 0]);
  const lift = useTransform(scrollYProgress, [0, 0.16], [34, 0]);
  const pan = useTransform(scrollYProgress, [0.16, 0.4, 0.68, 1], ['0%', '-14%', '-32%', '-50%']);

  const [step, setStep] = useState(0);
  useMotionValueEvent(scrollYProgress, 'change', (value) => {
    setStep(value < 0.32 ? 0 : value < 0.56 ? 1 : value < 0.78 ? 2 : 3);
  });
  const activeFocus = sceneSteps[step]?.focus ?? sceneSteps[0].focus;

  if (isCompact) {
    return (
      <section className="hx-shell hx-reveal-static">
        <StepRow activeStep="all" />
        <div className="hx-pin-static-frame">
          <DashboardWindow compact animateCompact={!reduce} />
        </div>
      </section>
    );
  }

  if (reduce) {
    return (
      <section className="hx-shell hx-reveal-static">
        <StepRow activeStep="all" />
        <div className="hx-pin-static-frame">
          <DashboardWindow />
        </div>
      </section>
    );
  }

  return (
    <section ref={ref} className="hx-pin">
      <div className="hx-pin-sticky">
        <div className="hx-pin-glow" aria-hidden="true" />
        <div className="hx-reveal-inner">
          <StepRow activeStep={step} />
          <div className="hx-pin-stage">
            <motion.div
              className="hx-window hx-window-motion"
              style={{ opacity, scale, rotateX, y: lift, transformPerspective: 1700 }}
            >
              <div className="hx-window-bar">
                <span className="hx-window-dots">
                  <i />
                  <i />
                  <i />
                </span>
                <span className="hx-window-url">app.solace.fyi/dashboard · Live</span>
                <span className="hx-window-spacer" />
              </div>
              <div className="hx-window-view">
                <motion.div className="hx-board-pan" style={{ y: pan }}>
                  <HermesBoardArt focus={activeFocus} />
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function HermesExperience({
  capitalVisual,
  dashboardPreview,
  dataAsOfLabel,
  pulseTone,
  updatedLabel,
}: HermesExperienceProps) {
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

      <LiveReadoutBand
        capitalVisual={capitalVisual}
        dashboardPreview={dashboardPreview}
        dataAsOfLabel={dataAsOfLabel}
        pulseTone={pulseTone}
        updatedLabel={updatedLabel}
      />

      <DashboardReveal />

      <section className="hx-shell">
        <div className="hx-apple-intro">
          <Reveal>
            <p className="section-kicker">Designed as an instrument</p>
          </Reveal>
          <Reveal delay={0.08}>
            <h2>Capital moves only when the signal earns it.</h2>
          </Reveal>
          <Reveal delay={0.14}>
            <p>
              Hermes is not a trading bot interface. It is a live oversight experience for reading uncertainty,
              preserving capital, and showing why the system is waiting or acting.
            </p>
          </Reveal>
        </div>
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
