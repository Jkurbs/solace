import type { Metadata } from 'next';
import Link from 'next/link';

import Mark from '../Mark';

export const metadata: Metadata = {
  title: 'Solace — Technical Brief',
  description:
    'What Solace builds, how it is disciplined, and how it can be checked. V0.1, June 2026. No performance claims.',
};

const gate = [
  { label: 'Capital threshold', status: 'Holding' },
  { label: 'Two full regime cycles', status: '0 of 2' },
  { label: 'Oracle calibration proven', status: 'Calibrating' },
  { label: 'Simulation load-bearing', status: 'Not begun' },
];

const sections = [
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
      'Calibration is the product. Every prediction is scored against the resolved outcome — Brier scoring machinery already runs inside the system — and the score is the Oracle’s only honest résumé. The Oracle is currently calibrating: no public numbers will be shown until the resolved sample is large enough to mean something.',
    ],
  },
  {
    number: '05',
    title: 'Risk discipline',
    body: [
      'Hermes operates through exchange-native accounts using trade-only API keys. Funds remain on the owner’s exchange; withdrawal by Hermes is impossible by construction, not by policy.',
      'Risk is governed in layers: posture (how boldly capital is routed, from preservation to velocity), sizing that scales with field depth, hard drawdown guards, and kill switches that halt the system entirely. Standing down is treated as a position, and the system takes it often.',
    ],
  },
  {
    number: '06',
    title: 'Verification',
    body: [
      'A system that manages capital should be checkable by the people who trust it. Solace commits to the following, in order of arrival: a decision trail recorded at decision time for every instrument; published Oracle calibration reports once the resolved-question sample crosses the disclosure threshold; and a regime log recording when and why Hermes stood down.',
      'The standard is simple: claims that can be checked, published when they can be checked. Anything not yet checkable is labeled with its honest status.',
    ],
  },
  {
    number: '07',
    title: 'Horizon',
    body: [
      'Beyond the live instruments, the roadmap runs through simulation — synthetic environments where hypotheses fail quietly before deployment — toward physical-world autonomy. Domains are earned, not declared. Expansion into autonomy is gated on the following conditions, and the board below is the public record of their status.',
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
            className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-[#6b6354] transition-colors hover:text-[#13110c]"
          >
            <Mark size={20} />
            Solace
          </Link>
          <Link
            href="/"
            className="font-mono text-xs uppercase tracking-[0.2em] text-[#6b6354] transition-colors hover:text-[#13110c]"
          >
            Home
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-4xl px-5 pb-24 pt-36 md:px-8">
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.24em] text-[#8a6a33]">
          Solace Technical Brief
        </p>
        <h1 className="mt-5 max-w-2xl font-serif text-5xl font-medium leading-tight text-[#13110c] md:text-7xl">
          What we build, and how to check it.
        </h1>
        <p className="mt-6 font-mono text-[0.65rem] uppercase tracking-[0.2em] text-[#6b6354]">
          V0.1 · June 2026 · Supersedes none · No performance claims
        </p>

        <div id="author" className="mt-10 flex items-center gap-5 border-t border-black/10 pt-8">
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
              Founder. Software engineer — four years building production systems at Apple. Every
              Solace instrument is designed, built, and operated by him, end to end.
            </p>
            <p className="mt-2 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-[#6b6354]">
              <a
                href="https://github.com/Jkurbs"
                target="_blank"
                rel="noopener noreferrer"
                className="brief-author-link"
              >
                GitHub
              </a>
              {' · '}
              <a href="mailto:jkurbs18@gmail.com" className="brief-author-link">
                Email
              </a>
              {' · Miami, FL'}
            </p>
          </div>
        </div>

        <div className="mt-16 space-y-14">
          {sections.map((section) => (
            <section key={section.number} id={`section-${section.number}`} className="border-t border-black/10 pt-8">
              <div className="grid gap-5 md:grid-cols-[6rem_1fr]">
                <p className="font-mono text-xs text-[#8a6a33]">{section.number}</p>
                <div>
                  <h2 className="font-serif text-3xl font-medium text-[#13110c] md:text-4xl">{section.title}</h2>
                  <div className="mt-5 space-y-4 text-base leading-8 text-[#3f3a30]">
                    {section.body.map((paragraph) => (
                      <p key={paragraph.slice(0, 40)}>{paragraph}</p>
                    ))}
                  </div>

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
                </div>
              </div>
            </section>
          ))}
        </div>

        <div className="mt-20 flex flex-col gap-3 border-t border-black/10 pt-6 md:flex-row md:items-center md:justify-between">
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-[#6b6354]">
            © 2026 Solace · Technical Brief V0.1
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
