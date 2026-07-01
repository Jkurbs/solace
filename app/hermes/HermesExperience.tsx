'use client';

import Link from 'next/link';
import type { ReactNode, RefObject } from 'react';
import { useEffect, useRef, useState } from 'react';
import {
  type MotionValue,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'framer-motion';

import Mark from '../Mark';
import HermesBoardArt, { HermesBoardMobileArt, type HermesBoardFocus } from './HermesBoardArt';
import RequestAccessForm from './RequestAccessForm';

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

const sceneSteps = [
  {
    kicker: 'Reads',
    title: 'One live surface.',
    text: 'Portfolio state, simulation status, and live freshness arrive before any detail.',
    focus: 'overview',
  },
  {
    kicker: 'Waits',
    title: 'Posture before action.',
    text: 'Risk profile, conviction, and exposure show why Hermes is waiting or acting.',
    focus: 'posture',
  },
  {
    kicker: 'Reads',
    title: 'The opportunity environment.',
    text: 'Hermes compresses regime, timing, and deployment conditions into one current read.',
    focus: 'outlook',
  },
  {
    kicker: 'Shows',
    title: 'Capital and decisions.',
    text: 'Allocation and recent activity stay visible while sensitive execution detail remains on protected account surfaces.',
    focus: 'execution',
  },
] satisfies Array<{
  kicker: string;
  title: string;
  text: string;
  focus: HermesBoardFocus;
}>;

const walkthroughPanTargets: Record<HermesBoardFocus, string> = {
  overview: '0%',
  posture: '-18%',
  outlook: '-33%',
  execution: '-50%',
};

const mobileWalkthroughPanStops = [0, 0.3, 0.58, 0.84, 1];
const mobileWalkthroughPanValues = [0, -21, -38, -53, -53];
const mobileWalkthroughFocusCuts = [-10.5, -29.5, -45.5];

const impactItems = [
  'Users understand what Hermes is doing through a clear operating read across posture, capital state, and rationale.',
  'Posture, capital state, risk level, current action, and decision rationale are visible in one read.',
  'The public preview uses the same sanitized brief contract that powers public Hermes updates.',
  'Sensitive signals, exact trades, prices, balances, PnL, and user-specific data stay on protected account surfaces.',
];

const accessSteps = [
  {
    label: '01',
    value: 'Review',
    note: 'Access is granted in stages after account review.',
  },
  {
    label: '02',
    value: 'Profile',
    note: 'Users select the risk profile Hermes must respect.',
  },
  {
    label: '03',
    value: 'Deposit',
    note: 'Capital is deposited directly into Solace and recorded to the user account.',
  },
  {
    label: '04',
    value: 'Allocation',
    note: 'Hermes can allocate only after settlement, treasury, and risk checks clear.',
  },
];

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

function useWalkthroughStep(
  ref: RefObject<HTMLElement | null>,
  enabled: boolean,
  viewportAnchorRatio = 0.5,
  itemAnchorRatio = 0.5,
) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setStep(0);
      return;
    }

    let frame = 0;

    const update = () => {
      frame = 0;
      const element = ref.current;

      if (!element) {
        return;
      }

      const steps = Array.from(element.querySelectorAll<HTMLElement>('.hx-walk-step'));
      const viewportAnchor = window.innerHeight * viewportAnchorRatio;
      const nextStep = steps.reduce(
        (best, item, index) => {
          const rect = item.getBoundingClientRect();
          const itemAnchor = rect.top + rect.height * itemAnchorRatio;
          const distance = Math.abs(itemAnchor - viewportAnchor);

          return distance < best.distance ? { distance, index } : best;
        },
        { distance: Number.POSITIVE_INFINITY, index: 0 },
      ).index;

      setStep((current) => (current === nextStep ? current : nextStep));
    };

    const requestUpdate = () => {
      if (frame) {
        return;
      }

      frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }

      window.removeEventListener('scroll', requestUpdate);
      window.removeEventListener('resize', requestUpdate);
    };
  }, [enabled, itemAnchorRatio, ref, viewportAnchorRatio]);

  return step;
}

function useMobileWalkthroughStep(panValue: MotionValue<number>, enabled: boolean) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setStep(0);
    }
  }, [enabled]);

  useMotionValueEvent(panValue, 'change', (value) => {
    if (!enabled) {
      return;
    }

    const nextStep =
      value <= mobileWalkthroughFocusCuts[2]
        ? 3
        : value <= mobileWalkthroughFocusCuts[1]
          ? 2
          : value <= mobileWalkthroughFocusCuts[0]
            ? 1
            : 0;

    setStep((current) => (current === nextStep ? current : nextStep));
  });

  return step;
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

function WalkthroughCopy({ activeStep }: { activeStep: number }) {
  return (
    <div className="hx-walk-copy">
      {sceneSteps.map((item, index) => (
        <div key={item.title} className={`hx-walk-step${activeStep === index ? ' is-active' : ''}`}>
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
  panY,
  panTarget,
}: {
  animateCompact?: boolean;
  compact?: boolean;
  focus?: HermesBoardFocus;
  panY?: MotionValue<string>;
  panTarget?: string;
}) {
  if (compact) {
    const hasPan = Boolean(panTarget ?? panY);

    return (
      <div className="hxm-panel">
        <div className={`hxm-panel-view${hasPan ? '' : ' is-static'}`}>
          {hasPan ? (
            <motion.div
              className="hxm-mobile-pan"
              animate={panY ? undefined : { y: panTarget }}
              style={panY ? { y: panY } : undefined}
              transition={panY ? undefined : { duration: 0.75, ease: EASE }}
            >
              <div className="hxm-board-track">
                <HermesBoardMobileArt focus={focus} />
              </div>
            </motion.div>
          ) : (
            <div className={`hxm-board-track${animateCompact ? ' is-animated' : ''}`}>
              <HermesBoardMobileArt focus={focus} />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="hx-window">
      <div className="hx-window-bar">
        <span className="hx-window-dots">
          <i />
          <i />
          <i />
        </span>
        <span className="hx-window-url">app.solace.fyi/dashboard · Live</span>
        <span className="hx-window-spacer" />
      </div>
      <div className={`hx-window-view${panTarget ? '' : ' is-static'}`}>
        {panTarget ? (
          <motion.div
            className="hx-board-pan"
            animate={{ y: panTarget }}
            transition={{ duration: 0.85, ease: EASE }}
          >
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
  const mobilePanProgress = useTransform(scrollYProgress, mobileWalkthroughPanStops, mobileWalkthroughPanValues);
  const mobilePanSpring = useSpring(mobilePanProgress, { stiffness: 150, damping: 34, mass: 0.3 });
  const mobilePanY = useTransform(mobilePanSpring, (value) => `${value}%`);
  const desktopStep = useWalkthroughStep(ref, !reduce && !isCompact);
  const mobileStep = useMobileWalkthroughStep(mobilePanSpring, !reduce && isCompact);
  const step = isCompact ? mobileStep : desktopStep;
  const activeFocus = sceneSteps[step]?.focus ?? sceneSteps[0].focus;

  if (isCompact && reduce) {
    return (
      <section className="hx-shell hx-reveal-static">
        <StepRow activeStep="all" />
        <div className="hx-pin-static-frame">
          <DashboardWindow compact />
        </div>
      </section>
    );
  }

  if (isCompact) {
    return (
      <section ref={ref} id="walkthrough" className="hx-mobile-walk">
        <div className="hx-pin-glow" aria-hidden="true" />
        <div className="hx-mobile-stage">
          <div className="hx-mobile-sticky">
            <DashboardWindow compact focus={activeFocus} panY={mobilePanY} />
          </div>
          <WalkthroughCopy activeStep={step} />
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
    <section ref={ref} id="walkthrough" className="hx-pin">
      <div className="hx-pin-glow" aria-hidden="true" />
      <div className="hx-walk-shell">
        <WalkthroughCopy activeStep={step} />
        <div className="hx-walk-stage">
          <div className="hx-walk-sticky">
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
                  <motion.div
                    className="hx-board-pan"
                    animate={{ y: walkthroughPanTargets[activeFocus] }}
                    transition={{ duration: 0.85, ease: EASE }}
                  >
                    <HermesBoardArt focus={activeFocus} />
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function HermesExperience() {
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
              Request Beta Access
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
              Hermes is a live oversight experience for reading uncertainty, preserving capital, and showing why
              the system is waiting or acting.
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
              The product should feel like checking on a professional allocator with a clear account record.
            </blockquote>
          </Reveal>
        </div>
      </section>

      <section className="hx-shell">
        <div className="hx-impact">
          <Reveal className="hx-feature-copy">
            <p className="section-kicker">Impact</p>
            <h2>A dashboard for live oversight.</h2>
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
            <p className="section-kicker">Before capital moves</p>
            <h2>Access begins with review.</h2>
            <p>
              Once approved, users complete onboarding, select a risk profile, and deposit directly into Solace.
              Capital becomes eligible for Hermes only after account, identity, settlement, treasury, and risk
              checks are complete.
            </p>
          </Reveal>
          <div className="hx-access-steps">
            {accessSteps.map((step, index) => (
              <Reveal key={step.label} className="hx-access-step" delay={index * 0.07}>
                <div className="hx-access-step-row">
                  <span>{step.label}</span>
                  <strong>{step.value}</strong>
                </div>
                <p>{step.note}</p>
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
