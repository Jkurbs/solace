import type { Metadata } from 'next';
import Link from 'next/link';

import SkyBackground from '../SkyBackground';
import Mark from '../Mark';

export const metadata: Metadata = {
  title: 'Solace — Hermes · Market Intelligence',
  description:
    'Hermes reads liquidity, timing, and regime structure and acts only when signal earns it. Non-custodial by construction. No performance claims.',
};

const facts = [
  { label: 'Status', value: 'Live', note: 'running in markets' },
  { label: 'Custody', value: 'Yours', note: 'funds stay on your exchange' },
  { label: 'Control', value: 'Trade-only', note: 'keys cannot withdraw' },
  { label: 'Posture', value: 'Selective', note: 'stands down often' },
];

const guarantees = [
  'Hermes connects through trade-only API keys. It can place and manage trades; it cannot withdraw.',
  'Your funds never leave your own exchange account. Solace never takes custody.',
  'Every decision is logged at the moment it is made — entries, exits, and stand-downs alike.',
  'A kill switch halts the system entirely, and it belongs to you.',
];

const postures = [
  {
    name: 'Preservation',
    text: 'Capital first. Hermes acts rarely, sizes conservatively, and treats drawdown as the enemy.',
  },
  {
    name: 'Balanced',
    text: 'The house posture. Selective entries, measured size, and discipline that bends without breaking.',
  },
  {
    name: 'Velocity',
    text: 'The full read of the field. When liquidity runs deep Hermes presses; when it thins it stands down.',
  },
];

export default function HermesPage() {
  return (
    <main className="oracle-page relative min-h-screen overflow-x-hidden text-foreground">
      <SkyBackground />

      <header className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-[rgba(4,4,3,0.58)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 md:px-8">
          <Link href="/" className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-muted transition-colors hover:text-foreground">
            <Mark size={20} />
            Solace
          </Link>
          <Link href="/" className="font-mono text-xs uppercase tracking-[0.2em] text-muted transition-colors hover:text-foreground">
            Home
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-5xl px-5 pb-24 pt-36 md:px-8">
        <div className="flex flex-wrap items-center gap-4">
          <p className="section-kicker">The first instrument</p>
          <span className="live-badge">
            <span className="live-dot" aria-hidden="true" />
            Live
          </span>
        </div>

        <h1 className="mt-5 max-w-3xl font-serif text-5xl font-medium leading-tight md:text-7xl">
          Hermes reads the field, and acts.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">
          Hermes is live market intelligence for liquidity, timing, and regime structure. It evaluates
          where price can actually travel, commits only when structure and timing agree, and stands
          down the rest of the time — which is most of the time.
        </p>

        <div className="oracle-statband">
          {facts.map((f) => (
            <div key={f.label}>
              <span>{f.label}</span>
              <strong>{f.value}</strong>
              <em>{f.note}</em>
            </div>
          ))}
        </div>

        <section className="mt-20 grid gap-12 border-t border-white/10 pt-12 md:grid-cols-2">
          <div>
            <h2 className="font-serif text-3xl font-medium md:text-4xl">How Hermes works</h2>
            <div className="mt-5 space-y-4 text-base leading-8 text-muted">
              <p>
                Hermes reads liquidity across multiple timeframes. Its core idea is the liquidity path:
                a destination matters less than whether the field between here and there can carry
                price. It maps candidate paths and waits.
              </p>
              <p>
                Execution is gated, not continuous. A decision engine sits between signal and order,
                enforcing entry conditions, sizing, stops, and portfolio limits. When the regime breaks
                character, Hermes changes posture or steps aside.
              </p>
            </div>
          </div>
          <div>
            <h2 className="font-serif text-3xl font-medium md:text-4xl">Built to stand down</h2>
            <div className="mt-5 space-y-4 text-base leading-8 text-muted">
              <p>
                Most market systems are built to act. Hermes is built to wait, and to recognize the
                difference between signal and noise. Doing nothing is treated as a position — often the
                correct one.
              </p>
              <p>
                The discipline is the product. Restraint is what survives contact with the world, and
                it is what Hermes is designed to hold under pressure.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-20 border-t border-white/10 pt-12">
          <p className="section-kicker">Custody &amp; control</p>
          <h2 className="mt-4 max-w-2xl font-serif text-3xl font-medium leading-tight md:text-5xl">
            You never hand over your money.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-8 text-muted">
            Hermes operates inside your own exchange account. The guarantees below are structural — true
            by construction, not by promise.
          </p>
          <ul className="trust-list">
            {guarantees.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        </section>

        <section className="mt-20 border-t border-white/10 pt-12">
          <h2 className="font-serif text-3xl font-medium md:text-4xl">Choose a posture</h2>
          <p className="mt-4 max-w-2xl text-base leading-8 text-muted">
            Access comes with a posture — how boldly Hermes routes your capital through the field. The
            posture sets activity, sizing, and how hard the drawdown guards hold.
          </p>
          <div className="posture-static">
            {postures.map((p, i) => (
              <div key={p.name}>
                <span className="font-mono text-xs text-accent">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="font-serif text-2xl font-medium md:text-3xl">{p.name}</h3>
                <p className="mt-2 text-sm leading-7 text-muted">{p.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-20 border-t border-white/10 pt-12">
          <div className="grid gap-12 md:grid-cols-[1fr_0.8fr] md:items-start">
            <div>
              <h2 className="font-serif text-3xl font-medium md:text-4xl">How access works</h2>
              <div className="mt-5 space-y-4 text-base leading-8 text-muted">
                <p>
                  Hermes runs live today. Managed access — connecting your own exchange and letting
                  Hermes operate within a posture you choose — is opening in stages.
                </p>
                <p>
                  Requesting access adds you to the early list. We reach out as eligibility and
                  structure allow. Nothing is asked of you now beyond a way to reach you, and no funds
                  or keys are involved at this step.
                </p>
              </div>
              <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-4">
                <a
                  href="mailto:jkurbs18@gmail.com?subject=Hermes%20access"
                  className="hermes-product-button hermes-product-button-light"
                >
                  Request access
                </a>
                <Link href="/brief" className="text-link">
                  Read the technical brief
                </Link>
              </div>
              <p className="mt-6 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-muted">
                Not an offer of advisory services · Access subject to eligibility and regulation
              </p>
            </div>
          </div>
        </section>

        <div className="mt-20 flex flex-col gap-3 border-t border-white/10 pt-6 md:flex-row md:items-center md:justify-between">
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-muted">
            Hermes · The first instrument · Live
          </p>
          <Link href="/" className="text-link">
            Return home
          </Link>
        </div>
      </article>
    </main>
  );
}
