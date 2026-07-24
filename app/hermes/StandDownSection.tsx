'use client';

import Link from 'next/link';

import { Reveal } from './shared';

// Mechanism patterns, not case studies: no dates, no outcomes, no vindication.
const patterns = [
  {
    number: 'Pattern 01',
    title: 'The false break',
    gate: 'Signal · Never clears',
    verdict: 'No action',
    text: 'Price clears a level, but the field doesn’t follow — the liquidity behind the move is too thin to carry it. The signal gate never clears, so nothing happens.',
  },
  {
    number: 'Pattern 02',
    title: 'Conflicting reads',
    gate: 'Regime · Out of character',
    verdict: 'Wait',
    text: 'Structure says go; the regime does not. One clear gate is not three. Hermes waits for alignment — and if alignment never comes, the wait was the decision.',
  },
  {
    number: 'Pattern 03',
    title: 'The character break',
    gate: 'Regime · Breaks while deployed',
    verdict: 'Reduce',
    text: 'Already deployed when volatility stops behaving like the regime it entered in. The regime gate fails and exposure comes down — posture first, questions after.',
  },
];

export default function StandDownSection() {
  return (
    <section className="hx-stand">
      <div className="hx-shell">
        <div className="hx-gates-head">
          <Reveal>
            <p className="section-kicker">Standing down is a position</p>
          </Reveal>
          <Reveal delay={0.08}>
            <h2>The edge is the trades not taken.</h2>
          </Reveal>
          <Reveal delay={0.14}>
            <p>
              Hermes&apos;s discipline shows most clearly in what it declines. Three patterns it is built to
              refuse — illustrative mechanism, not case studies.
            </p>
          </Reveal>
        </div>
        <div className="hx-stand-grid">
          {patterns.map((pattern, index) => (
            <Reveal key={pattern.number} className="hx-stand-card" delay={index * 0.08}>
              <span>{pattern.number}</span>
              <strong>{pattern.title}</strong>
              <p>{pattern.text}</p>
              <div className="hx-stand-verdict">
                <em>{pattern.gate}</em>
                <span className="hx-gate-chip is-waiting">{pattern.verdict}</span>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={0.1}>
          <p className="hx-stand-note">
            The brief commits to a regime log — a public record of when and why Hermes stood down — as part of
            verification.{' '}
            <Link href="/brief#section-07" className="text-link">
              Read the commitment
            </Link>
          </p>
        </Reveal>
      </div>
    </section>
  );
}
