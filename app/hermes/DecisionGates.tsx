'use client';

import { useRef } from 'react';
import { useReducedMotion } from 'framer-motion';

import { Reveal, useMediaQuery, useWalkthroughStep } from './shared';

type GateStatus = 'waiting' | 'checking' | 'clear';

const gateRows = [
  { id: '01', label: 'Signal', question: 'Is the path worth evaluating?' },
  { id: '02', label: 'Regime', question: 'Is the market in character?' },
  { id: '03', label: 'Timing', question: 'Is now the moment?' },
] as const;

const gateSteps = [
  {
    kicker: 'Layer 01 · Signal',
    title: 'Read the path, not the destination.',
    text: 'Hermes reads liquidity distribution across timeframes. A price target matters less than whether the field between here and there can carry price.',
  },
  {
    kicker: 'Layer 02 · Regime',
    title: 'Know what kind of market this is.',
    text: 'Every regime has a character — how it trends, how it absorbs volume, how volatility behaves. Hermes acts only inside regimes it recognizes.',
  },
  {
    kicker: 'Layer 03 · Timing',
    title: 'Signal must earn the order.',
    text: 'A dedicated decision engine sits between signal and order. Entry conditions, position sizing, stops, and portfolio constraints all have to clear.',
  },
  {
    kicker: 'The gate',
    title: 'Deploy only when all three agree.',
    text: 'Most hours they don’t agree, and the correct action is none. Execution is gated, not continuous — waiting and standing down are decisions like any other.',
  },
];

function statusFor(rowIndex: number, step: number): GateStatus {
  if (step > rowIndex || step >= gateRows.length) return 'clear';
  if (step === rowIndex) return 'checking';
  return 'waiting';
}

const statusLabel: Record<GateStatus, string> = {
  waiting: 'Waiting',
  checking: 'Checking',
  clear: 'Clear',
};

function GatePanel({ step }: { step: number }) {
  const allClear = step >= gateRows.length;
  const verdict = allClear ? 'deploy' : 'wait';

  return (
    <div className="hx-gate-panel">
      <div className="hx-gate-panel-bar">
        <span>Decision engine</span>
        <em>Illustrative</em>
      </div>
      <div className="hx-gate-rows">
        {gateRows.map((row, index) => {
          const status = statusFor(index, step);
          return (
            <div key={row.id} className={`hx-gate-row is-${status}`}>
              <span className="hx-gate-id">{row.id}</span>
              <div className="hx-gate-q">
                <strong>{row.label}</strong>
                <p>{row.question}</p>
              </div>
              <span className={`hx-gate-chip is-${status}`}>{statusLabel[status]}</span>
            </div>
          );
        })}
      </div>
      <div className="hx-gate-verdict">
        <span className={`hx-verdict-chip${verdict === 'deploy' ? ' is-active is-deploy' : ''}`}>Deploy</span>
        <span className={`hx-verdict-chip${verdict === 'wait' ? ' is-active' : ''}`}>Wait</span>
        <span className="hx-verdict-chip">Stand down</span>
      </div>
      <p className="hx-gate-note">
        {allClear
          ? 'Structure, timing, and regime agree — capital may move, sized to the depth of the field.'
          : 'Until every gate clears, capital does not move.'}
      </p>
    </div>
  );
}

function GatesHead() {
  return (
    <div className="hx-gates-head">
      <Reveal>
        <p className="section-kicker">How Hermes decides</p>
      </Reveal>
      <Reveal delay={0.08}>
        <h2>Three reads. One gate.</h2>
      </Reveal>
      <Reveal delay={0.14}>
        <p>
          Between every signal and every order sits a gate with three conditions. Nothing is bought or sold
          because a forecast feels right — the structure, the regime, and the moment each have to clear.
        </p>
      </Reveal>
    </div>
  );
}

export default function DecisionGates() {
  const reduce = useReducedMotion();
  const isCompact = useMediaQuery('(max-width: 860px)');
  const ref = useRef<HTMLElement | null>(null);
  const step = useWalkthroughStep(ref, !reduce, '.hx-gates-step', isCompact ? 0.72 : 0.5);

  if (reduce) {
    return (
      <section className="hx-gates is-flat">
        <div className="hx-shell">
          <GatesHead />
          <div className="hx-gates-flat">
            {gateSteps.map((item, index) => (
              <Reveal key={item.kicker} className="hx-gates-step is-active" delay={index * 0.06}>
                <span>{item.kicker}</span>
                <strong>{item.title}</strong>
                <p>{item.text}</p>
              </Reveal>
            ))}
            <Reveal delay={0.1}>
              <GatePanel step={gateRows.length} />
            </Reveal>
          </div>
        </div>
      </section>
    );
  }

  if (isCompact) {
    return (
      <section ref={ref} className="hx-gates">
        <div className="hx-shell">
          <GatesHead />
        </div>
        <div className="hx-mwalk">
          <div className="hx-mwalk-sticky">
            <GatePanel step={step} />
          </div>
          <div className="hx-mwalk-copy">
            {gateSteps.map((item, index) => (
              <div
                key={item.kicker}
                className={`hx-mwalk-step hx-gates-step${step === index ? ' is-active' : ''}`}
              >
                <span>{item.kicker}</span>
                <strong>{item.title}</strong>
                <p>{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section ref={ref} className="hx-gates">
      <div className="hx-shell">
        <GatesHead />
      </div>
      <div className="hx-walk-shell">
        <div className="hx-walk-copy">
          {gateSteps.map((item, index) => (
            <div key={item.kicker} className={`hx-walk-step hx-gates-step${step === index ? ' is-active' : ''}`}>
              <span>{item.kicker}</span>
              <strong>{item.title}</strong>
              <p>{item.text}</p>
            </div>
          ))}
        </div>
        <div className="hx-walk-stage hx-gates-stage">
          <div className="hx-walk-sticky">
            <GatePanel step={step} />
          </div>
        </div>
      </div>
    </section>
  );
}
