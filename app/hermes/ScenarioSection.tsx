'use client';

import { useRef } from 'react';
import { type MotionValue, motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';

import { Reveal, useMediaQuery, useWalkthroughStep } from './shared';

// One illustrative pass through the gate. Mechanism only: postures, gates,
// and sizing — never outcomes, prices, or P&L.

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const POINT_COUNT = 120;
const VIEW_W = 800;
const VIEW_H = 300;
const CORRIDOR_START = 38;
const CORRIDOR_END = 74;
const BREAK_INDEX = 92;

const points = (() => {
  const random = mulberry32(51);
  const result: Array<{ x: number; y: number }> = [];
  let y = 196;

  for (let i = 0; i < POINT_COUNT; i += 1) {
    const x = 16 + (i / (POINT_COUNT - 1)) * (VIEW_W - 32);
    let drift = 0;
    let vol = 4.4;

    if (i >= CORRIDOR_START && i < CORRIDOR_END) {
      drift = -1.5; // the corridor: an orderly climb
      vol = 3;
    } else if (i >= CORRIDOR_END && i < BREAK_INDEX) {
      drift = -0.25;
      vol = 4;
    } else if (i >= BREAK_INDEX) {
      drift = 1.9; // character break: disorderly give-back
      vol = 13;
    }

    y += drift + (random() - 0.5) * vol * 2;
    y = Math.min(VIEW_H - 34, Math.max(38, y));
    result.push({ x, y: Math.round(y * 100) / 100 });
  }

  return result;
})();

const linePath = points
  .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x},${point.y}`)
  .join(' ');

function bandWidthAt(index: number) {
  return index >= BREAK_INDEX ? 30 : 11;
}

const bandPath = (() => {
  const upper = points.map(
    (point, index) => `${index === 0 ? 'M' : 'L'}${point.x},${point.y - bandWidthAt(index) - 6}`,
  );
  const lower = [...points]
    .reverse()
    .map((point, index) => `L${point.x},${point.y + bandWidthAt(POINT_COUNT - 1 - index) + 6}`);
  return `${upper.join(' ')} ${lower.join(' ')} Z`;
})();

const corridorPath = (() => {
  const segment = points.slice(CORRIDOR_START, CORRIDOR_END + 1);
  const upper = segment.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x},${point.y - 26}`);
  const lower = [...segment].reverse().map((point) => `L${point.x},${point.y + 26}`);
  return `${upper.join(' ')} ${lower.join(' ')} Z`;
})();

const deployPoint = points[CORRIDOR_END];
const breakPoint = points[BREAK_INDEX];

type Posture = 'SELECTIVE' | 'DEPLOYED' | 'DEFENSIVE' | 'STANDING DOWN';
type ChipState = 'waiting' | 'checking' | 'clear' | 'break';

type Beat = {
  kicker: string;
  title: string;
  text: string;
  posture: Posture;
  gates: [ChipState, ChipState, ChipState];
  exposure: number;
  exposureLabel: string;
};

const beats: Beat[] = [
  {
    kicker: 'Beat 01 · Quiet tape',
    title: 'Watching, not acting.',
    text: 'Several paths are under evaluation. None has earned capital, so none receives it. This is where Hermes spends most of its life.',
    posture: 'SELECTIVE',
    gates: ['checking', 'waiting', 'waiting'],
    exposure: 0,
    exposureLabel: 'None',
  },
  {
    kicker: 'Beat 02 · A path forms',
    title: 'Liquidity deepens along one corridor.',
    text: 'The signal gate clears. The destination still matters less than the field — the question is whether it can carry price from here to there.',
    posture: 'SELECTIVE',
    gates: ['clear', 'checking', 'waiting'],
    exposure: 0,
    exposureLabel: 'None',
  },
  {
    kicker: 'Beat 03 · In character',
    title: 'The regime is behaving like itself.',
    text: 'Trend, volume absorption, and volatility all match the regime’s known character. Two gates clear. Timing is still being checked.',
    posture: 'SELECTIVE',
    gates: ['clear', 'clear', 'checking'],
    exposure: 0,
    exposureLabel: 'None',
  },
  {
    kicker: 'Beat 04 · Deployed',
    title: 'Timing confirms. Capital moves.',
    text: 'All three gates agree, so the position is opened — sized to the depth of the field, never to the strength of the conviction.',
    posture: 'DEPLOYED',
    gates: ['clear', 'clear', 'clear'],
    exposure: 0.62,
    exposureLabel: 'Sized to depth',
  },
  {
    kicker: 'Beat 05 · Character break',
    title: 'The regime stops behaving.',
    text: 'Volatility widens outside the regime’s character and the regime gate fails. Hermes doesn’t argue with it: posture changes, exposure comes down.',
    posture: 'DEFENSIVE',
    gates: ['clear', 'break', 'clear'],
    exposure: 0.24,
    exposureLabel: 'Reduced',
  },
  {
    kicker: 'Beat 06 · Standing down',
    title: 'Leaving is also a decision.',
    text: 'Conditions never recover their character, so the remaining exposure is closed. No forecast was required — only the discipline to leave when the conditions did.',
    posture: 'STANDING DOWN',
    gates: ['waiting', 'break', 'waiting'],
    exposure: 0,
    exposureLabel: 'None',
  },
];

const gateShort = ['Signal', 'Regime', 'Timing'];

const chipLabel: Record<ChipState, string> = {
  waiting: 'Waiting',
  checking: 'Checking',
  clear: 'Clear',
  break: 'Break',
};

const DISCLAIMER =
  'Illustrative sequence — mechanism, not history. No prices, outcomes, or performance are shown; the real record lives in the decision trail.';

function ScenarioFigure({
  drawnLength,
  step,
}: {
  drawnLength?: MotionValue<number>;
  step: number;
}) {
  return (
    <svg
      className="hx-scn-chart"
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path d={bandPath} className={`hx-scn-band${step >= 4 ? ' is-broken' : ''}`} />
      <path d={corridorPath} className={`hx-scn-corridor${step >= 1 ? ' is-visible' : ''}`} />
      {drawnLength ? (
        <motion.path d={linePath} className="hx-scn-line" style={{ pathLength: drawnLength }} />
      ) : (
        <path d={linePath} className="hx-scn-line" />
      )}
      <g className={`hx-scn-marker${step >= 3 ? ' is-visible' : ''}`}>
        <circle cx={deployPoint.x} cy={deployPoint.y} r={5} />
        <text x={deployPoint.x} y={deployPoint.y - 14}>
          Deployed
        </text>
      </g>
      <g className={`hx-scn-marker is-break${step >= 4 ? ' is-visible' : ''}`}>
        <line x1={breakPoint.x} y1={16} x2={breakPoint.x} y2={VIEW_H - 16} />
        <text x={breakPoint.x + 8} y={34}>
          Character break
        </text>
      </g>
    </svg>
  );
}

function ScenarioPanel({
  drawnLength,
  step,
}: {
  drawnLength?: MotionValue<number>;
  step: number;
}) {
  const beat = beats[Math.min(step, beats.length - 1)];
  const postureClass = beat.posture.toLowerCase().replace(' ', '-');

  return (
    <div className="hx-scn-panel">
      <div className="hx-gate-panel-bar">
        <span>One pass through the gate</span>
        <em>Illustrative</em>
      </div>
      <ScenarioFigure drawnLength={drawnLength} step={step} />
      <div className="hx-scn-status">
        <div className="hx-scn-status-cell">
          <em>Posture</em>
          <span className={`hx-scn-posture is-${postureClass}`}>{beat.posture}</span>
        </div>
        <div className="hx-scn-status-cell">
          <em>Gates</em>
          <span className="hx-scn-gates">
            {beat.gates.map((state, index) => (
              <span key={gateShort[index]} className={`hx-gate-chip is-${state}`}>
                {gateShort[index]} · {chipLabel[state]}
              </span>
            ))}
          </span>
        </div>
        <div className="hx-scn-status-cell">
          <em>Exposure</em>
          <span className="hx-scn-exposure">
            <span className="hx-scn-exposure-rail">
              <i style={{ transform: `scaleX(${beat.exposure})` }} />
            </span>
            {beat.exposureLabel}
          </span>
        </div>
      </div>
    </div>
  );
}

function ScenarioHead() {
  return (
    <div className="hx-gates-head">
      <Reveal>
        <p className="section-kicker">Watch it work</p>
      </Reveal>
      <Reveal delay={0.08}>
        <h2>One pass through the gate.</h2>
      </Reveal>
      <Reveal delay={0.14}>
        <p>
          A single illustrative sequence, start to finish: how posture, gates, and sizing move while a path
          forms, carries, and breaks character.
        </p>
      </Reveal>
    </div>
  );
}

export default function ScenarioSection() {
  const reduce = useReducedMotion();
  const isCompact = useMediaQuery('(max-width: 860px)');
  const ref = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const drawnLength = useTransform(scrollYProgress, [0.02, 0.92], [0, 1]);
  const step = useWalkthroughStep(ref, !reduce, '.hx-scn-step', isCompact ? 0.72 : 0.5);

  if (reduce) {
    return (
      <section className="hx-scn is-flat">
        <div className="hx-shell">
          <ScenarioHead />
          <Reveal delay={0.1}>
            <ScenarioPanel step={beats.length - 1} />
          </Reveal>
          <div className="hx-gates-flat">
            {beats.map((beat, index) => (
              <Reveal key={beat.kicker} className="hx-scn-step is-active" delay={index * 0.05}>
                <span>{beat.kicker}</span>
                <strong>{beat.title}</strong>
                <p>{beat.text}</p>
              </Reveal>
            ))}
          </div>
          <Reveal>
            <p className="hx-scn-disclaimer">{DISCLAIMER}</p>
          </Reveal>
        </div>
      </section>
    );
  }

  if (isCompact) {
    return (
      <section ref={ref} className="hx-scn">
        <div className="hx-shell">
          <ScenarioHead />
        </div>
        <div className="hx-mwalk">
          <div className="hx-mwalk-sticky">
            <ScenarioPanel drawnLength={drawnLength} step={step} />
          </div>
          <div className="hx-mwalk-copy">
            {beats.map((beat, index) => (
              <div
                key={beat.kicker}
                className={`hx-mwalk-step hx-scn-step${step === index ? ' is-active' : ''}`}
              >
                <span>{beat.kicker}</span>
                <strong>{beat.title}</strong>
                <p>{beat.text}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="hx-shell">
          <p className="hx-scn-disclaimer">{DISCLAIMER}</p>
        </div>
      </section>
    );
  }

  return (
    <section ref={ref} className="hx-scn">
      <div className="hx-shell">
        <ScenarioHead />
      </div>
      <div className="hx-walk-shell">
        <div className="hx-walk-copy">
          {beats.map((beat, index) => (
            <div key={beat.kicker} className={`hx-walk-step hx-scn-step${step === index ? ' is-active' : ''}`}>
              <span>{beat.kicker}</span>
              <strong>{beat.title}</strong>
              <p>{beat.text}</p>
            </div>
          ))}
        </div>
        <div className="hx-walk-stage hx-scn-stage">
          <div className="hx-walk-sticky">
            <ScenarioPanel drawnLength={drawnLength} step={step} />
            <p className="hx-scn-disclaimer">{DISCLAIMER}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
