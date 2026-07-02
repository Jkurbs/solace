'use client';

import { useRef } from 'react';
import { type MotionValue, motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';

import { Reveal, useMediaQuery } from './shared';

// Deterministic price walk so server and client render the same figure.
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

const POINT_COUNT = 140;
const VIEW_W = 800;
const VIEW_H = 360;

// Volatility profile: quiet tape, pressure building, burst, unresolved aftermath.
function volatilityAt(index: number) {
  if (index < 46) return 3.4;
  if (index < 76) return 6.5;
  if (index < 104) return 13;
  return 8;
}

const points = (() => {
  const random = mulberry32(20260702);
  const result: Array<{ x: number; y: number }> = [];
  let y = 210;
  let drift = -0.35;

  for (let i = 0; i < POINT_COUNT; i += 1) {
    const x = 20 + (i / (POINT_COUNT - 1)) * (VIEW_W - 40);
    const vol = volatilityAt(i);
    if (i % 18 === 0) {
      drift = (random() - 0.5) * 1.7;
    }
    y += drift + (random() - 0.5) * vol * 2;
    y = Math.min(VIEW_H - 46, Math.max(52, y));
    result.push({ x, y: Math.round(y * 100) / 100 });
  }

  return result;
})();

const linePath = points
  .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x},${point.y}`)
  .join(' ');

// Regime band: an envelope around the walk whose width follows the volatility profile.
const bandPath = (() => {
  const upper = points.map(
    (point, index) => `${index === 0 ? 'M' : 'L'}${point.x},${point.y - volatilityAt(index) * 3.2 - 8}`,
  );
  const lower = [...points]
    .reverse()
    .map((point, index) => `L${point.x},${point.y + volatilityAt(POINT_COUNT - 1 - index) * 3.2 + 8}`);
  return `${upper.join(' ')} ${lower.join(' ')} Z`;
})();

const questions = [
  { text: 'Is this move real, or noise?', left: '6%', top: '16%', window: [0.18, 0.4] },
  { text: 'Has the regime changed character?', left: '32%', top: '68%', window: [0.36, 0.56] },
  { text: 'Can liquidity carry price from here to there?', left: '46%', top: '12%', window: [0.52, 0.72] },
  { text: 'Should capital move at all — or wait?', left: '62%', top: '60%', window: [0.68, 0.86] },
] as const;

function ProblemQuestion({
  caption = false,
  progress,
  question,
}: {
  caption?: boolean;
  progress: MotionValue<number>;
  question: (typeof questions)[number];
}) {
  const [start, end] = question.window;
  const opacity = useTransform(progress, [start, start + 0.05, end - 0.04, end], [0, 1, 1, 0]);
  const y = useTransform(progress, [start, start + 0.05], [14, 0]);

  if (caption) {
    return (
      <motion.p className="hx-problem-caption" style={{ opacity, y }}>
        {question.text}
      </motion.p>
    );
  }

  return (
    <motion.p className="hx-problem-question" style={{ opacity, y, left: question.left, top: question.top }}>
      {question.text}
    </motion.p>
  );
}

function ProblemHead() {
  return (
    <>
      <p className="section-kicker">The problem</p>
      <h2>Markets don&apos;t announce which moves are real.</h2>
      <p>
        Price is always visible. Whether the field around it can carry capital is not. Liquidity thins, timing
        slips, and regimes change character without notice.
      </p>
    </>
  );
}

const CLOSING_LINE =
  'Four questions, every hour the market is open. Hermes exists to answer them with discipline.';

function ProblemStatic() {
  return (
    <div className="hx-shell">
      <Reveal className="hx-problem-head">
        <ProblemHead />
      </Reveal>
      <Reveal delay={0.1}>
        <div className="hx-problem-panel">
          <svg
            className="hx-problem-chart"
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path d={bandPath} className="hx-problem-band" />
            <path d={linePath} className="hx-problem-line" />
          </svg>
        </div>
      </Reveal>
      <Reveal delay={0.16}>
        <ul className="hx-problem-list">
          {questions.map((question) => (
            <li key={question.text}>{question.text}</li>
          ))}
        </ul>
      </Reveal>
      <Reveal delay={0.2}>
        <p className="hx-problem-close">{CLOSING_LINE}</p>
      </Reveal>
    </div>
  );
}

export default function ProblemSection() {
  const reduce = useReducedMotion();
  const isCompact = useMediaQuery('(max-width: 860px)');
  const ref = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });

  const pathLength = useTransform(scrollYProgress, [0.04, 0.72], [0, 1]);
  const bandOpacity = useTransform(scrollYProgress, [0.24, 0.46], [0, 1]);
  const headOpacity = useTransform(scrollYProgress, [0, 0.06, 0.86, 0.98], [0, 1, 1, 0.4]);
  const closeOpacity = useTransform(scrollYProgress, [0.82, 0.92], [0, 1]);
  const closeY = useTransform(scrollYProgress, [0.82, 0.92], [16, 0]);

  if (reduce) {
    return (
      <section className="hx-problem is-flat">
        <ProblemStatic />
      </section>
    );
  }

  return (
    <section ref={ref} className={`hx-problem${isCompact ? ' is-compact' : ''}`}>
      <div className="hx-problem-sticky">
        <div className="hx-shell hx-problem-stage">
          <motion.div className="hx-problem-head" style={{ opacity: headOpacity }}>
            <ProblemHead />
          </motion.div>
          <div className="hx-problem-panel">
            <svg
              className="hx-problem-chart"
              viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <motion.path d={bandPath} className="hx-problem-band" style={{ opacity: bandOpacity }} />
              <motion.path d={linePath} className="hx-problem-line" style={{ pathLength }} />
            </svg>
            {!isCompact &&
              questions.map((question) => (
                <ProblemQuestion key={question.text} progress={scrollYProgress} question={question} />
              ))}
          </div>
          {isCompact && (
            <div className="hx-problem-captions">
              {questions.map((question) => (
                <ProblemQuestion key={question.text} caption progress={scrollYProgress} question={question} />
              ))}
            </div>
          )}
          <motion.p className="hx-problem-close" style={{ opacity: closeOpacity, y: closeY }}>
            {CLOSING_LINE}
          </motion.p>
        </div>
      </div>
    </section>
  );
}
