'use client';

import Link from 'next/link';

import Mark from '@/app/Mark';

type SiteFooterVariant = 'editorial' | 'product';

const researchLinks = [
  { label: 'Technical brief', href: '/brief' },
  { label: 'Research notes', href: '/research' },
  { label: 'News', href: '/news' },
  { label: 'Observatory', href: '/observatory' },
  { label: 'Decision ledger', href: '/observatory/hermes/ledger' },
  { label: 'Gate conditions', href: '/gates' },
] as const;

const instrumentLinks = [
  { label: 'Hermes', href: '/hermes', status: 'Live' },
  { label: 'Oracle', href: '/oracle', status: 'Live' },
  { label: 'Simulation', href: '/gates#simulation', status: 'In progress' },
  { label: 'Glorya', href: '/glorya', status: 'Evaluating' },
] as const;

export default function SiteFooter({ variant = 'editorial' }: { variant?: SiteFooterVariant }) {
  const isEditorial = variant === 'editorial';

  if (!isEditorial) {
    return (
      <footer className="border-t border-white/[0.06] bg-[#040405] px-5 py-10 text-white/50">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 md:flex-row">
          <Link href="/" className="inline-flex items-center gap-2 text-white/80 transition-colors hover:text-white">
            <Mark size={16} />
            <span className="text-sm font-medium tracking-[-0.02em]">Solace</span>
          </Link>
          <p className="text-xs">Independent research company · 2026</p>
          <div className="flex items-center gap-6 text-xs">
            <Link href="/terms" className="transition-colors hover:text-white">Terms</Link>
            <Link href="/privacy" className="transition-colors hover:text-white">Privacy</Link>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="border-t border-[var(--line)] bg-[var(--background)] px-5 pt-14 pb-10 md:pt-20 md:pb-12">
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" className="inline-flex items-center gap-2 text-foreground transition-colors">
              <Mark size={20} />
              <span className="text-xl font-medium tracking-[-0.02em]">Solace</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
              Independent research company building instruments that help capital, and eventually other domains, make
              better decisions under uncertainty.
            </p>
            <p className="mt-6 font-mono text-xs uppercase tracking-wider text-muted">Era I · The First Instrument</p>
            <p className="mt-6 text-xs text-muted">Domains are earned.</p>
          </div>

          <div>
            <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-foreground">Research</p>
            <ul className="mt-5 space-y-3">
              {researchLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-foreground">Instruments</p>
            <ul className="mt-5 space-y-3">
              {instrumentLinks.map((link) => (
                <li key={link.href} className="flex items-center justify-between gap-4">
                  <Link href={link.href} className="text-sm text-muted transition-colors hover:text-foreground">
                    {link.label}
                  </Link>
                  <span className="font-mono text-[0.6rem] uppercase tracking-[0.1em] text-muted">{link.status}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-foreground">Contact</p>
            <ul className="mt-5 space-y-3 text-sm text-muted">
              <li>
                <a href="mailto:hello@solace.fyi" className="transition-colors hover:text-foreground">
                  hello@solace.fyi
                </a>
                <span className="ml-2 text-xs text-muted/70">General</span>
              </li>
              <li>
                <a
                  href="https://x.com/solacefyi"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-foreground"
                >
                  @solacefyi
                </a>
                <span className="ml-2 text-xs text-muted/70">Public notes</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-[var(--line)] pt-6 md:flex-row md:items-center">
          <p className="text-xs text-muted">© 2026 Solace. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-6 text-xs text-muted">
            <Link href="/terms" className="transition-colors hover:text-foreground">
              Terms
            </Link>
            <Link href="/privacy" className="transition-colors hover:text-foreground">
              Privacy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
