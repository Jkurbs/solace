'use client';

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

import HermesBoardArt, { HermesBoardMobileArt, type HermesBoardFocus } from './HermesBoardArt';
import { EASE, useMediaQuery, useWalkthroughStep } from './shared';

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

/**
 * Original Hermes marketing dashboard reveal: sticky scroll walkthrough
 * that pans and focuses regions of the illustrative board.
 */
export default function DashboardReveal() {
  const reduce = useReducedMotion();
  const isCompact = useMediaQuery('(max-width: 860px)');
  const ref = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });

  const entrySpring = { stiffness: 160, damping: 30, mass: 0.4 };
  const opacity = useSpring(useTransform(scrollYProgress, [0, 0.08], [0.72, 1]), entrySpring);
  const scale = useSpring(useTransform(scrollYProgress, [0, 0.16], [0.94, 1]), entrySpring);
  const rotateX = useSpring(useTransform(scrollYProgress, [0, 0.16], [7, 0]), entrySpring);
  const lift = useSpring(useTransform(scrollYProgress, [0, 0.16], [34, 0]), entrySpring);
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
                    transition={{ type: 'spring', stiffness: 110, damping: 26, mass: 0.9 }}
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
