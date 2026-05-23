'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

const ease = [0.16, 1, 0.3, 1] as [number, number, number, number];

const fade = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 1, ease },
  },
};

const stagger = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.18,
    },
  },
};

const systems = [
  {
    index: '01',
    name: 'Hermes',
    status: 'Live',
    category: 'Market intelligence',
    description:
      'The first live instrument: reading liquidity, timing, and structure until signal earns action.',
  },
  {
    index: '02',
    name: 'Decision Systems',
    status: 'Research',
    category: 'Probabilistic engines',
    description:
      'State-aware engines for decisions where timing, uncertainty, and feedback decide the outcome.',
  },
  {
    index: '03',
    name: 'Simulation',
    status: 'Building',
    category: 'Synthetic environments',
    description:
      'Controlled worlds where hypotheses fail quietly before they are allowed into the open.',
  },
  {
    index: '04',
    name: 'Autonomy',
    status: 'Horizon',
    category: 'Physical-world systems',
    description:
      'The long horizon: intelligence that carries the same discipline into physical-world action.',
  },
];

const principles = [
  {
    label: 'Observe',
    text: 'Let the world speak before the model explains it.',
  },
  {
    label: 'Model',
    text: 'Turn state, timing, and uncertainty into structure.',
  },
  {
    label: 'Deploy',
    text: 'Keep only what feedback refuses to break.',
  },
];

const notes = [
  {
    index: '01',
    title: 'Capital velocity',
    text: 'Compounding is measured by time, not just direction.',
  },
  {
    index: '02',
    title: 'Liquidity path efficiency',
    text: 'A destination matters less when the path cannot carry price.',
  },
  {
    index: '03',
    title: 'Regime detection',
    text: 'The system changes posture when the environment changes character.',
  },
];

const hermesMetrics = [
  {
    label: 'Signal',
    value: 'Structure',
  },
  {
    label: 'Posture',
    value: 'Selective',
  },
  {
    label: 'Feedback',
    value: 'Live',
  },
];

function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
    </span>
  );
}

function Header() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-[rgba(4,4,3,0.58)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-3" aria-label="Solace home">
          <BrandMark />
          <span className="font-mono text-xs uppercase text-muted">Solace</span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-muted md:flex" aria-label="Primary navigation">
          <Link href="/vision" className="transition-colors hover:text-foreground">
            Vision
          </Link>
          <a href="#hermes" className="transition-colors hover:text-foreground">
            Hermes
          </a>
          <a href="#systems" className="transition-colors hover:text-foreground">
            Systems
          </a>
          <a href="#research" className="transition-colors hover:text-foreground">
            Research
          </a>
        </nav>

        <Link href="/vision" className="nav-cta">
          Thesis
        </Link>
      </div>
    </header>
  );
}

function AnimatedSignalLayer() {
  return (
    <div className="signal-stage" aria-hidden="true">
      <span className="signal-plane plane-one" />
      <span className="signal-plane plane-two" />
      <span className="signal-plane plane-three" />

      <div className="signal-orbit-system">
        <div className="instrument-core">
          <span className="instrument-ring ring-a" />
          <span className="instrument-ring ring-b" />
          <span className="instrument-ring ring-c" />
          <span className="instrument-axis axis-a" />
          <span className="instrument-axis axis-b" />
          <span className="instrument-center" />
        </div>
        <span className="signal-orbit orbit-one" />
        <span className="signal-orbit orbit-two" />
        <span className="signal-orbit orbit-three" />
        <span className="signal-orbit orbit-four" />
        <span className="signal-sweep" />
        <span className="signal-node node-one" />
        <span className="signal-node node-two" />
        <span className="signal-node node-three" />
        <span className="signal-node node-four" />
        <span className="signal-node node-five" />
      </div>

      <div className="signal-ledger">
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

function HermesInstrument() {
  return (
    <div className="hermes-instrument" aria-hidden="true">
      <span className="hermes-arc hermes-arc-one" />
      <span className="hermes-arc hermes-arc-two" />
      <span className="hermes-arc hermes-arc-three" />
      <span className="hermes-axis hermes-axis-one" />
      <span className="hermes-axis hermes-axis-two" />
      <span className="hermes-point hermes-point-one" />
      <span className="hermes-point hermes-point-two" />
      <span className="hermes-point hermes-point-three" />
      <span className="hermes-point hermes-point-four" />
      <span className="hermes-core">H</span>
    </div>
  );
}

export default function Home() {
  return (
    <main className="home-shell relative min-h-screen overflow-x-hidden text-foreground">
      <Header />

      <section className="hero-luxury relative min-h-[92vh] overflow-hidden px-5 pb-24 pt-32 md:px-8 md:pb-28 md:pt-36">
        <AnimatedSignalLayer />
        <div className="hero-vignette" />

        <motion.div
          initial="hidden"
          animate="show"
          variants={stagger}
          className="hero-content relative z-10 mx-auto grid max-w-7xl items-center"
        >
          <div className="hero-copy max-w-3xl">
            <motion.p variants={fade} className="section-kicker">
              Private intelligence observatory
            </motion.p>
            <motion.h1
              variants={fade}
              className="hero-title mt-6 max-w-3xl font-serif text-[clamp(3.4rem,9vw,8rem)] font-medium leading-[0.9]"
            >
              Systems for reading complexity.
            </motion.h1>
            <motion.p variants={fade} className="hero-body mt-7 max-w-2xl text-base leading-8 text-muted md:text-lg">
              Solace builds instruments for uncertainty: systems that observe, model, deploy, and keep only what
              survives contact with the world.
            </motion.p>
            <motion.div variants={fade} className="hero-actions mt-9 flex flex-wrap items-center gap-x-7 gap-y-3">
              <Link href="/vision" className="primary-link">
                Read the thesis
              </Link>
              <a href="#hermes" className="text-link">
                Enter Hermes
              </a>
            </motion.div>
          </div>
        </motion.div>

        <div className="hero-caption">
          <span>Hermes</span>
          <span>Live system</span>
          <span>Market structure</span>
        </div>
      </section>

      <section className="luxury-band px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto grid max-w-7xl gap-8 border-y border-white/10 py-8 md:grid-cols-[0.7fr_1fr] md:items-center">
          <p className="section-kicker">Operating posture</p>
          <p className="max-w-4xl font-serif text-3xl font-medium leading-tight text-foreground md:text-5xl">
            Only what works under real-world feedback deserves to be called intelligence.
          </p>
        </div>
      </section>

      <section id="hermes" className="hermes-section scroll-mt-24 px-5 py-20 md:px-8 md:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 border-t border-white/10 pt-10 lg:grid-cols-[0.78fr_1fr] lg:items-center">
          <div className="max-w-2xl">
            <p className="section-kicker">First live system</p>
            <h2 className="mt-4 font-serif text-4xl font-medium leading-tight md:text-6xl">
              Hermes is the first instrument.
            </h2>
            <p className="mt-6 max-w-xl text-base leading-8 text-muted md:text-lg">
              It reads liquidity, timing, and capital posture in the open. The model does not get to stay beautiful
              unless feedback agrees.
            </p>
            <div className="hermes-metrics">
              {hermesMetrics.map((metric) => (
                <div key={metric.label}>
                  <span>{metric.label}</span>
                  <strong>{metric.value}</strong>
                </div>
              ))}
            </div>
          </div>

          <HermesInstrument />
        </div>
      </section>

      <section id="systems" className="scroll-mt-24 px-5 py-20 md:px-8 md:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 md:grid-cols-[0.7fr_1fr]">
            <div>
              <p className="section-kicker">Systems</p>
              <h2 className="mt-4 max-w-xl font-serif text-4xl font-medium leading-tight md:text-6xl">
                Built with restraint. Earned by contact.
              </h2>
            </div>
            <div className="system-list">
              {systems.map((system) => (
                <article key={system.name} className="luxury-row">
                  <div className="flex items-baseline justify-between gap-5">
                    <span className="font-mono text-xs text-accent">{system.index}</span>
                    <span className="font-mono text-xs text-muted">{system.status}</span>
                  </div>
                  <div>
                    <h3 className="font-serif text-3xl font-medium md:text-4xl">{system.name}</h3>
                    <p className="mt-2 text-sm leading-7 text-muted">{system.category}</p>
                  </div>
                  <p className="max-w-2xl text-base leading-8 text-muted">{system.description}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-20 md:px-8 md:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 border-t border-white/10 pt-10 lg:grid-cols-[0.55fr_1fr]">
            <div>
              <p className="section-kicker">Method</p>
              <h2 className="mt-4 max-w-lg font-serif text-4xl font-medium leading-tight md:text-6xl">
                A quiet loop for uncertain worlds.
              </h2>
            </div>
            <div className="grid gap-8 md:grid-cols-3">
              {principles.map((principle, index) => (
                <div key={principle.label} className="principle">
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <h3>{principle.label}</h3>
                  <p>{principle.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="research" className="scroll-mt-24 px-5 py-20 md:px-8 md:py-28">
        <div className="mx-auto grid max-w-7xl gap-10 border-t border-white/10 pt-10 lg:grid-cols-[0.58fr_1fr]">
          <div>
            <p className="section-kicker">Research</p>
            <h2 className="mt-4 max-w-xl font-serif text-4xl font-medium leading-tight md:text-6xl">
              Notes that become experiments. Experiments that become systems.
            </h2>
          </div>

          <div className="space-y-8">
            <p className="max-w-2xl text-base leading-8 text-muted md:text-lg">
              Solace presents research as a living surface. Ideas are kept only when they sharpen ranking, risk,
              timing, or deployment behavior.
            </p>
            <div className="research-list">
              {notes.map((note) => (
                <article key={note.index} className="research-row">
                  <span className="font-mono text-xs text-accent">{note.index}</span>
                  <div>
                    <h3 className="font-serif text-2xl font-medium md:text-3xl">{note.title}</h3>
                    <p className="mt-2 max-w-2xl text-sm leading-7 text-muted">{note.text}</p>
                  </div>
                </article>
              ))}
            </div>
            <Link href="/vision" className="text-link">
              Open the thesis
            </Link>
          </div>
        </div>
      </section>

      <footer className="px-5 pb-10 pt-10 md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 border-t border-white/10 pt-6 text-sm text-muted md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-serif text-2xl font-medium text-foreground">Solace</p>
            <p className="mt-1">Independent research company.</p>
          </div>
          <div className="font-mono text-xs text-muted">Vision / Systems / Research</div>
        </div>
      </footer>
    </main>
  );
}
