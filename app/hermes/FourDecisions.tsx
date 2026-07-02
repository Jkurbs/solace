'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { useMotionValueEvent, useReducedMotion, useScroll } from 'framer-motion';

import { Reveal } from './shared';

// Adapted from the research note "The Four Decisions That Govern Capital".
const decisions = [
  {
    number: '01',
    title: 'Selection',
    question: 'Where should attention go?',
    text: 'Liquidity, regime, opportunity cost, and capital efficiency compress into one question: is this path worth continued attention? Most candidates fail here, quietly.',
  },
  {
    number: '02',
    title: 'Commitment',
    question: 'When is evidence strong enough?',
    text: 'Attention is cheap; capital is not. Commitment happens only when structure, timing, and regime agree — and it is sized to the field, never to the feeling.',
  },
  {
    number: '03',
    title: 'Monitoring',
    question: 'Does the evidence still hold?',
    text: 'Deployment is not completion. This is where Hermes spends most of its life — asking whether the evidence still supports the capital at risk, and changing posture the moment it doesn’t.',
  },
  {
    number: '04',
    title: 'Exit',
    question: 'Stay, reduce, or recycle?',
    text: 'Exits are decided by conditions, not by hope. Capital that leaves a path is preserved and recycled into the next one that earns attention.',
  },
];

function DecisionCard({ decision, active }: { decision: (typeof decisions)[number]; active?: boolean }) {
  return (
    <article className={`hx-dec-card${active ? ' is-active' : ''}`}>
      <span className="hx-dec-number">{decision.number}</span>
      <div className="hx-dec-body">
        <em>{decision.question}</em>
        <strong>{decision.title}</strong>
        <p>{decision.text}</p>
      </div>
    </article>
  );
}

function DecisionsHead() {
  return (
    <div className="hx-gates-head">
      <Reveal>
        <p className="section-kicker">The framework</p>
      </Reveal>
      <Reveal delay={0.08}>
        <h2>Four decisions govern capital.</h2>
      </Reveal>
      <Reveal delay={0.14}>
        <p>
          Every allocation Hermes makes — including the decision to make none — reduces to four questions,
          asked in order, over and over.
        </p>
      </Reveal>
    </div>
  );
}

function DecisionsFootnote() {
  return (
    <p className="hx-dec-footnote">
      The framework is public.{' '}
      <Link href="/research" className="text-link">
        Read the research note
      </Link>
    </p>
  );
}

export default function FourDecisions() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const [active, setActive] = useState(0);

  useMotionValueEvent(scrollYProgress, 'change', (value) => {
    const next = Math.min(
      decisions.length - 1,
      Math.max(0, Math.floor(((value - 0.06) / 0.82) * decisions.length)),
    );
    setActive((current) => (current === next ? current : next));
  });

  if (reduce) {
    return (
      <section className="hx-dec is-flat">
        <div className="hx-shell">
          <DecisionsHead />
          <div className="hx-dec-list">
            {decisions.map((decision, index) => (
              <Reveal key={decision.number} delay={index * 0.06}>
                <DecisionCard decision={decision} active />
              </Reveal>
            ))}
          </div>
          <Reveal>
            <DecisionsFootnote />
          </Reveal>
        </div>
      </section>
    );
  }

  return (
    <section ref={ref} className="hx-dec">
      <div className="hx-dec-sticky">
        <div className="hx-shell hx-dec-stage">
          <DecisionsHead />
          <div className="hx-dec-deck">
            {decisions.map((decision, index) => (
              <DecisionCard key={decision.number} decision={decision} active={index === active} />
            ))}
          </div>
          <div className="hx-dec-rail" role="presentation">
            {decisions.map((decision, index) => (
              <i key={decision.number} className={index === active ? 'is-active' : undefined} />
            ))}
          </div>
          <DecisionsFootnote />
        </div>
      </div>
    </section>
  );
}
