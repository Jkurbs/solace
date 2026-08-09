'use client';

import Link from 'next/link';

import Mark from '@/app/Mark';

export type SiteFooterVariant = 'paper' | 'ink';

const researchLinks = [
  { label: 'Technical brief', href: '/brief' },
  { label: 'Research notes', href: '/research' },
  { label: 'News', href: '/news' },
  { label: 'Observatory', href: '/observatory' },
  { label: 'Decision ledger', href: '/observatory/hermes/ledger' },
  { label: 'Chain anchors', href: '/anchor' },
  { label: 'Gate conditions', href: '/gates' },
] as const;

const instrumentLinks = [
  { label: 'Hermes', href: '/hermes', status: 'Live' },
  { label: 'Oracle', href: '/oracle', status: 'Live' },
  { label: 'Simulation', href: '/gates#simulation', status: 'In progress' },
  { label: 'Glorya', href: '/glorya', status: 'Evaluating' },
] as const;

/** Dark ink footer is the site standard. Paper remains for rare light-only embeds. */
export default function SiteFooter({ variant = 'ink' }: { variant?: SiteFooterVariant }) {
  const isInk = variant === 'ink';
  const bg = isInk ? 'bg-[#0a0a0a]' : 'bg-[var(--paper-warm)]';
  const text = isInk ? 'text-white' : 'text-[var(--paper-ink)]';
  const muted = isInk ? 'text-white/60' : 'text-[var(--paper-muted)]';
  const line = isInk ? 'border-white/10' : 'border-[var(--paper-line)]';
  const linkHover = isInk ? 'hover:text-white' : 'hover:text-[var(--paper-ink)]';

  return (
    <footer className={`border-t ${line} ${bg} px-5 pt-16 pb-10 md:pt-20 md:pb-12`}>
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <Link
              href="/"
              className={`group inline-flex items-center gap-2 text-xl font-medium tracking-[-0.02em] ${text} transition-opacity hover:opacity-70`}
            >
              <Mark size={20} className="transition-transform duration-500 group-hover:rotate-45" />
              <span>Solace</span>
            </Link>
            <p className={`mt-4 max-w-xs text-sm leading-relaxed ${muted}`}>
              Independent research company building instruments that help capital, and eventually other domains, make
              better decisions under uncertainty.
            </p>
            <p className={`mt-6 font-mono text-xs uppercase tracking-wider ${muted}`}>
              Era I · The First Instrument
            </p>
            <p className={`mt-2 text-xs ${muted}`}>Domains are earned.</p>
          </div>

          <div>
            <p className={`font-mono text-[0.65rem] font-semibold uppercase tracking-[0.14em] ${text}`}>
              Research
            </p>
            <ul className="mt-5 space-y-3">
              {researchLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={`text-sm ${muted} transition-colors ${linkHover}`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className={`font-mono text-[0.65rem] font-semibold uppercase tracking-[0.14em] ${text}`}>
              Instruments
            </p>
            <ul className="mt-5 space-y-3">
              {instrumentLinks.map((link) => (
                <li key={link.href} className="flex items-center justify-between gap-4">
                  <Link
                    href={link.href}
                    className={`text-sm ${muted} transition-colors ${linkHover}`}
                  >
                    {link.label}
                  </Link>
                  <span className={`font-mono text-[0.6rem] uppercase tracking-[0.1em] ${muted}`}>
                    {link.status}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className={`font-mono text-[0.65rem] font-semibold uppercase tracking-[0.14em] ${text}`}>
              Contact
            </p>
            <ul className={`mt-5 space-y-3 text-sm ${muted}`}>
              <li>
                <a
                  href="mailto:hello@solace.fyi"
                  className={`transition-colors ${linkHover}`}
                >
                  hello@solace.fyi
                </a>
                <span className={`ml-2 text-xs ${isInk ? 'text-white/40' : 'text-[var(--paper-muted)]/70'}`}>General</span>
              </li>
              <li>
                <a
                  href="https://x.com/solacefyi"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`transition-colors ${linkHover}`}
                >
                  @solacefyi
                </a>
                <span className={`ml-2 text-xs ${isInk ? 'text-white/40' : 'text-[var(--paper-muted)]/70'}`}>Public notes</span>
              </li>
            </ul>
          </div>
        </div>

        <div className={`mt-14 flex flex-col items-start justify-between gap-4 border-t ${line} pt-6 md:flex-row md:items-center`}>
          <p className={`text-xs ${muted}`}>© 2026 Solace. All rights reserved.</p>
          <div className={`flex flex-wrap items-center gap-6 text-xs ${muted}`}>
            <Link href="/terms" className={`transition-colors ${linkHover}`}>
              Terms
            </Link>
            <Link href="/privacy" className={`transition-colors ${linkHover}`}>
              Privacy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
