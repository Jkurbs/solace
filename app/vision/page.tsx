import Link from 'next/link';

const notes = [
  {
    number: '01',
    title: 'Mission',
    label: 'Reason to exist',
    body: [
      'Solace is an independent research company building intelligent systems that observe, model, and act in complex environments.',
      'The company begins with markets because markets compress feedback. They expose timing, uncertainty, capital allocation, and system quality without waiting years for the truth.',
    ],
  },
  {
    number: '02',
    title: 'First system',
    label: 'Deployed artifact',
    body: [
      'Hermes is the first deployed system. It studies market structure, liquidity, timing, and capital efficiency to improve real-world decision making.',
      'This is not detached research. It is a live surface where Solace earns its ideas through deployment.',
    ],
  },
  {
    number: '03',
    title: 'Research method',
    label: 'Operating loop',
    body: [
      'Every Solace project follows the same loop: observe the environment, model the state, simulate possible paths, deploy into the world, and learn from the result.',
      'That loop applies to Hermes now and to future systems later. The domain changes. The discipline does not.',
    ],
  },
  {
    number: '04',
    title: 'Research notes',
    label: 'Working hypotheses',
    body: [
      'Current notes include capital velocity, liquidity path efficiency, dead capital risk, and regime detection.',
      'These are not blog topics. They are working hypotheses with operational consequences for ranking, risk, and deployment behavior.',
    ],
  },
  {
    number: '05',
    title: 'Experiments',
    label: 'Proof mechanism',
    body: [
      'The point of Solace is not to sound intelligent. The point is to test ideas until they survive contact with reality or fail cleanly.',
      'Notes should become experiments, and experiments should become systems only when they have earned that transition.',
    ],
  },
  {
    number: '06',
    title: 'Horizon',
    label: 'Long direction',
    body: [
      'Beyond Hermes, Solace expands into decision systems, simulation environments, and eventually physical-world autonomy.',
      'The long-term ambition is broader than trading, but the standard should stay the same: clear hypotheses, disciplined testing, and deployed systems that improve through feedback.',
    ],
  },
];

const principles = ['Feedback over theater', 'Models under pressure', 'Deployment with restraint'];

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

        <nav className="hidden items-center gap-8 text-sm text-muted md:flex" aria-label="Vision navigation">
          <Link href="/" className="transition-colors hover:text-foreground">
            Home
          </Link>
          <a href="#thesis" className="transition-colors hover:text-foreground">
            Thesis
          </a>
          <a href="#chapters" className="transition-colors hover:text-foreground">
            Chapters
          </a>
        </nav>

        <Link href="/" className="nav-cta">
          Home
        </Link>
      </div>
    </header>
  );
}

export default function VisionPage() {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      <Header />

      <section id="thesis" className="vision-luxury-hero relative px-5 pb-20 pt-32 md:px-8 md:pb-28 md:pt-36">
        <div className="hero-image hero-image-subtle" />
        <div className="hero-vignette" />

        <div className="relative z-10 mx-auto grid min-h-[70vh] max-w-7xl items-end gap-12 lg:grid-cols-[1fr_0.46fr]">
          <div>
            <p className="section-kicker">Thesis</p>
            <h1 className="mt-6 max-w-5xl font-serif text-[clamp(3.2rem,8vw,7.5rem)] font-medium leading-[0.9]">
              Build research as a system. Let the system compound.
            </h1>
            <p className="mt-8 max-w-3xl text-lg leading-8 text-muted md:text-xl">
              Solace studies complex environments, converts observation into models, and deploys intelligent systems
              that improve through feedback.
            </p>
          </div>

          <aside className="thesis-aside">
            <p className="section-kicker">Operating standard</p>
            <div className="mt-6 space-y-5">
              {principles.map((principle, index) => (
                <div key={principle} className="standard-row">
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <p>{principle}</p>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section id="chapters" className="px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-7xl border-y border-white/10 py-6">
          <div className="chapter-strip">
            {notes.map((section) => (
              <a key={section.number} href={`#section-${section.number}`} className="chapter-link">
                <span>{section.number}</span>
                <strong>{section.title}</strong>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 pb-28 pt-10 md:px-8 md:pb-36">
        <div className="mx-auto max-w-7xl space-y-12">
          {notes.map((section) => (
            <section key={section.number} id={`section-${section.number}`} className="vision-grid border-t border-white/10 pt-10">
              <div>
                <p className="vision-number">{section.number}</p>
                <p className="mt-4 hidden max-w-[10rem] text-sm leading-6 text-muted md:block">{section.label}</p>
              </div>
              <div className="grid gap-8 lg:grid-cols-[0.42fr_1fr]">
                <div>
                  <p className="section-kicker">{section.label}</p>
                  <h2 className="mt-4 font-serif text-4xl font-medium leading-tight md:text-5xl">{section.title}</h2>
                </div>
                <div className="max-w-4xl space-y-5 text-base leading-8 text-muted md:text-lg">
                  {section.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </div>
            </section>
          ))}
        </div>
      </section>

      <section className="px-5 pb-20 md:px-8 md:pb-28">
        <div className="mx-auto grid max-w-7xl gap-8 border-t border-white/10 pt-10 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="section-kicker">Next surface</p>
            <p className="mt-4 max-w-3xl font-serif text-4xl font-medium leading-tight md:text-5xl">
              The next step is turning the thesis into living note and system pages.
            </p>
          </div>
          <Link href="/" className="text-link">
            Return home
          </Link>
        </div>
      </section>

      <footer className="px-5 pb-10 md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 border-t border-white/10 pt-6 text-sm text-muted md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-serif text-2xl font-medium text-foreground">Solace</p>
            <p className="mt-1">Independent research company.</p>
          </div>
          <span className="font-mono text-xs text-muted">Vision / Home</span>
        </div>
      </footer>
    </main>
  );
}
