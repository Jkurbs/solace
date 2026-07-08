import type { Metadata } from 'next';
import Link from 'next/link';

import Mark from '../Mark';

export const metadata: Metadata = {
  title: 'Solace — Technical Brief',
  description:
    'What Solace builds, how it is disciplined, and how it can be checked. V0.4, July 2026. No performance claims.',
};

const gate = [
  { label: 'Regime cycles', status: '0 of 2' },
  { label: 'Capital threshold', status: 'Holding — figure to be published' },
  { label: 'Oracle calibration proven', status: 'Calibrating' },
  { label: 'Simulation load-bearing', status: 'Not begun' },
];

type BriefSection = {
  number: string;
  title: string;
  body: string[];
  /** Bulleted commitments/definitions rendered after the body paragraphs. */
  list?: string[];
  /** Closing paragraphs rendered after the list (and the gate board in §07). */
  after?: string[];
};

const sections: BriefSection[] = [
  {
    number: '01',
    title: 'Thesis',
    body: [
      'Solace is an independent research company building instruments for decision-making under uncertainty. The operating belief is narrow and testable: individual events resist prediction, but the structure around them — liquidity, timing, regime, probability — can be read, modeled, and acted on with discipline.',
      'Solace begins with markets because markets compress feedback. They expose timing, uncertainty, and system quality in days rather than years, and they fund the work. Every instrument follows one loop: observe, model, simulate, deploy — and keep only what survives contact with the world.',
    ],
  },
  {
    number: '02',
    title: 'The observatory',
    body: [
      'Two instruments operate today. Hermes reads market structure and acts on it. The Oracle holds questions about real events open and weighs futures until the world resolves them. They share one discipline: signal must earn action, and most of the time the correct action is none.',
      'Both instruments log their decisions as they are made. Nothing in the record is written retroactively.',
    ],
  },
  {
    number: '03',
    title: 'Hermes — the market instrument',
    body: [
      'Hermes is a live system that reads liquidity distribution, timing, and regime character across multiple timeframes. Its core abstraction is the liquidity path: the premise that a price destination matters less than whether the field between here and there can carry price. Hermes evaluates candidate paths and commits only when structure, timing, and regime agree.',
      'Execution is gated, not continuous. A dedicated decision engine sits between signal and order, enforcing entry conditions, position sizing, stop placement, and portfolio constraints. When the regime breaks character, Hermes changes posture or stands down entirely.',
      'This brief deliberately describes Hermes at the level of architecture, not features. The specific signals, parameters, and models are the work, and they are not published.',
    ],
  },
  {
    number: '04',
    title: 'The Oracle — the event instrument',
    body: [
      'The Oracle is a probability engine over event markets, beginning with exchange-listed target markets on crypto assets. For each open question it builds an order-book view, produces a probability estimate, and records that estimate before resolution.',
      'Calibration is the product. Every prediction is scored against the resolved outcome — Brier scoring machinery already runs inside the system — and the score is the Oracle’s only honest résumé. The Oracle is currently calibrating. The interim record — every resolved question, scored, misses included — is published as it stands on the public calibration page, labeled as a young sample; headline calibration claims wait until the resolved sample is large enough to mean something.',
    ],
  },
  {
    number: '05',
    title: 'Risk discipline',
    body: [
      'Hermes currently allocates founder capital only — no outside capital is at risk while access opens in stages. As approved users come online, they fund Hermes by depositing capital directly into Solace through the account dashboard: deposits are recorded to the user’s Solace account, pass through settlement and treasury controls, and become eligible for Hermes allocation only after onboarding, identity, and risk checks are complete.',
      'Risk is governed in layers: posture (how boldly capital is routed, from preservation to velocity), sizing that scales with field depth, hard drawdown guards, and kill switches that halt the system entirely. Money movement stays separate from signal generation: deposits, withdrawals, account value, and available balance remain visible through Solace account rails. Standing down is treated as a position, and the system takes it often.',
    ],
  },
  {
    number: '06',
    title: 'Verification',
    body: [
      'A system that manages capital should be checkable by the people who trust it. Solace commits to the following, in order of arrival:',
    ],
    list: [
      'A decision trail recorded at decision time for every instrument, public where it can be published without exposing the mechanism, private where it can’t — reviewable on request once outside capital is involved.',
      'While Hermes runs founder capital only, the public decision ledger shows each decision’s outcome and PnL in full — wins, losses, and waits. Every row is hashed and chained to the row before it when it is sealed, so any later edit to the record is mathematically detectable — integrity that can be recomputed, not taken on faith. The only money at risk is the founder’s own, and the sample is labeled for what it is: young. Disclosure for any future outside capital will be defined with counsel and stated here before it applies.',
      'Published Oracle calibration reports once the resolved-question sample crosses the disclosure threshold.',
      'A regime log recording when and why Hermes stood down.',
      'Once a public ledger has enough resolved rows to be meaningful, an independent reviewer — named, with their own verifiable background — will be given access to the private record to confirm it matches what’s published. Who that reviewer is, and what they confirmed, will be public.',
    ],
    after: [
      'The standard is simple: claims that can be checked, published when they can be checked. Anything not yet checkable is labeled with its honest status. That includes this founder’s track record, which does not yet exist in a form worth calling a track record — Hermes and the Oracle are the mechanism by which it will.',
    ],
  },
  {
    number: '07',
    title: 'Horizon',
    body: [
      'Everything in this brief describes what Solace does now. This section describes what it’s for, stated at a distance, on purpose.',
      'The instruments Solace builds are not specific to financial markets. Hermes reads structure, timing, and regime to decide when a system should act and when it should stand down. Markets are where that loop is tested first, because they compress feedback into days instead of years and because they fund the work. The longer aim is instruments that make the same kind of disciplined, checkable decisions in systems beyond finance — wherever timing, resource allocation, and uncertainty matter and outcomes can be verified against reality. This is a multi-year horizon, named now so the gate conditions below have a destination, not a near-term roadmap item.',
      'Domains are earned, not declared. Expansion beyond markets is gated on the conditions below, and this board is the public record of their status. Each gate is defined so it can be checked, not just claimed:',
    ],
    list: [
      'Regime cycles — a complete bull-and-bear cycle in the primary markets Hermes trades. By construction, this gate is measured in years, not months.',
      'Capital threshold — a minimum of sustained, verified founder-and-approved-user capital under management, held through at least one full drawdown, before scale is considered. The specific figure will be published once it’s set, not held back after the fact.',
      'Oracle calibration proven — a Brier score on a resolved-question sample large enough to be statistically meaningful, published in full, not selectively.',
      'Simulation load-bearing — synthetic environments are trusted to catch a failure before deployment, demonstrated by at least one documented case where simulation caught something live testing would have missed.',
    ],
    after: [
      'Until every gate clears, Solace is a markets company. That’s not a hedge — it’s the actual current scope.',
    ],
  },
  {
    number: '08',
    title: 'Disclosures',
    body: [
      'This document describes systems under active development. It is not an offer of advisory services, not investment advice, and contains no performance claims. Access to any Solace instrument is subject to eligibility and applicable regulation. This brief is versioned; later versions supersede earlier ones, and the version history will remain public.',
    ],
  },
];

export default function BriefPage() {
  return (
    <main className="brief-paper relative min-h-screen overflow-x-hidden">
      <header className="fixed inset-x-0 top-0 z-40 border-b border-black/10 bg-[rgba(247,242,232,0.86)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4 md:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.2em] text-[#6b6354] transition-colors hover:text-[#13110c]"
          >
            <Mark size={20} />
            Solace
          </Link>
          <Link
            href="/"
            className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-[#6b6354] transition-colors hover:text-[#13110c]"
          >
            Home
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-4xl px-5 pb-24 pt-36 md:px-8">
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.24em] text-[#7c7468]">
          Solace Technical Brief
        </p>
        <h1 className="mt-5 max-w-2xl font-serif text-5xl font-medium leading-tight text-[#13110c] md:text-7xl">
          What we build, and how to check it.
        </h1>
        <p className="mt-6 font-mono text-[0.65rem] uppercase tracking-[0.2em] text-[#6b6354]">
          V0.4 · July 2026 · Supersedes{' '}
          <Link href="/brief/v0-3" className="brief-author-link">
            V0.3
          </Link>{' '}
          · No performance claims
        </p>

        <div id="author" className="mt-10 border-t border-black/10 pt-8">
          <div className="flex items-center gap-5">
            <img
              src="/assets/kerby-jean.jpg"
              alt="Kerby Jean, founder of Solace"
              width={64}
              height={64}
              className="brief-author-photo"
            />
            <div>
              <p className="font-serif text-xl font-medium text-[#13110c] md:text-2xl">Kerby Jean</p>
              <p className="mt-1 max-w-xl text-sm leading-6 text-[#4f483c]">
                Founder. Software engineer — four years building production systems at Apple. Today,
                every Solace instrument is designed, built, and operated by him end to end.
              </p>
            </div>
          </div>
          <div className="mt-6 max-w-2xl space-y-4 text-base leading-8 text-[#3f3a30]">
            <p>
              I don&rsquo;t have a background in institutional trading, asset management, or quantitative
              finance. I&rsquo;m not going to imply otherwise.
            </p>
            <p>
              What I have is four years building production systems that had to work under real
              conditions, and enough time and founder capital in markets to believe there is structure
              worth testing.
            </p>
            <p>That belief is unproven.</p>
            <p>
              Founder capital, the public ledger, and the gate conditions in this brief exist because I
              don&rsquo;t think a claim like that should be taken on trust. It should be checked.
            </p>
            <p>
              Solace is currently a one-person project. There is no team beyond me. That will be true
              until it isn&rsquo;t, and if it changes, this brief will say so.
            </p>
          </div>
          <p className="mt-5 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-[#6b6354]">
            <a
              href="https://github.com/Jkurbs"
              target="_blank"
              rel="noopener noreferrer"
              className="brief-author-link"
            >
              GitHub
            </a>
            {' · '}
            <a href="mailto:kerby@solace.fyi" className="brief-author-link">
              Email
            </a>
            {' · Miami, FL'}
          </p>
        </div>

        <nav className="mt-12 border-t border-black/10 pt-8" aria-label="Brief contents">
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-[#7c7468]">Contents</p>
          <ol className="mt-4 grid gap-x-10 gap-y-2.5 sm:grid-cols-2">
            {sections.map((section) => (
              <li key={section.number}>
                <a
                  href={`#section-${section.number}`}
                  className="inline-flex items-baseline gap-3 text-[#4f483c] transition-colors hover:text-[#13110c]"
                >
                  <span className="font-mono text-xs text-[#7c7468]">{section.number}</span>
                  <span className="font-serif text-base">{section.title}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-16 space-y-14">
          {sections.map((section) => (
            <section key={section.number} id={`section-${section.number}`} className="border-t border-black/10 pt-8">
              <div className="grid gap-5 md:grid-cols-[6rem_1fr]">
                <p className="font-mono text-xs text-[#7c7468]">{section.number}</p>
                <div>
                  <h2 className="font-serif text-3xl font-medium text-[#13110c] md:text-4xl">{section.title}</h2>
                  <div className="mt-5 space-y-4 text-base leading-8 text-[#3f3a30]">
                    {section.body.map((paragraph) => (
                      <p key={paragraph.slice(0, 40)}>{paragraph}</p>
                    ))}
                  </div>

                  {section.list ? (
                    <ul className="mt-5 list-disc space-y-3 pl-5 text-base leading-8 text-[#3f3a30] marker:text-[#b8955a]">
                      {section.list.map((item) => (
                        <li key={item.slice(0, 40)}>{item}</li>
                      ))}
                    </ul>
                  ) : null}

                  {section.number === '07' && (
                    <div className="gate-board" aria-label="Autonomy gate conditions">
                      <p className="gate-board-title">Gate conditions — domains are earned</p>
                      <ul>
                        {gate.map((condition, index) => (
                          <li key={condition.label}>
                            <span className="gate-index">{String(index + 1).padStart(2, '0')}</span>
                            <span>{condition.label}</span>
                            <span className="gate-leader" aria-hidden="true" />
                            <span className="gate-status">{condition.status}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {section.after ? (
                    <div className="mt-5 space-y-4 text-base leading-8 text-[#3f3a30]">
                      {section.after.map((paragraph) => (
                        <p key={paragraph.slice(0, 40)}>{paragraph}</p>
                      ))}
                    </div>
                  ) : null}

                  {section.number === '06' && (
                    <p className="mt-5 font-mono text-xs uppercase tracking-[0.16em]">
                      <Link href="/trust" className="brief-author-link">
                        View the public decision ledger →
                      </Link>
                    </p>
                  )}
                </div>
              </div>
            </section>
          ))}
        </div>

        <div className="mt-20 flex flex-col gap-3 border-t border-black/10 pt-6 md:flex-row md:items-center md:justify-between">
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-[#6b6354]">
            © 2026 Solace · Technical Brief V0.4
          </p>
          <Link
            href="/"
            className="font-mono text-xs uppercase tracking-[0.18em] text-[#6b6354] transition-colors hover:text-[#13110c]"
          >
            Return home
          </Link>
        </div>
      </article>
    </main>
  );
}
