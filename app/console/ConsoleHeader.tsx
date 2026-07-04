import Link from 'next/link';

import Mark from '@/app/Mark';

import ConsoleLiveRefresh from './ConsoleLiveRefresh';

function formatBadgeCount(count: number) {
  return count > 9 ? '9+' : count.toString();
}

const navLinks = [
  { href: '/console', label: 'Console' },
  { href: '/console/articles', label: 'Articles' },
  { href: '/console/bugops', label: 'BugOps' },
  { href: '/console/social-observatory', label: 'Social' },
];

const secondaryLinks = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/dashboard/contract', label: 'Contracts' },
  { href: '/hermes', label: 'Hermes' },
];

export default function ConsoleHeader({ pendingAccessCount = 0 }: { pendingAccessCount?: number }) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0a0a0a]/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.2em] text-neutral-50"
          >
            <Mark size={18} />
            Solace
            <span className="hidden font-normal text-neutral-500 sm:inline">· Console</span>
          </Link>
          <ConsoleLiveRefresh />
        </div>
        {/* Single scrollable row on mobile so every destination stays reachable
            at any width — no grid wrap, no hidden pages. */}
        <nav
          className="-mx-4 flex w-[calc(100%+2rem)] items-center gap-1 overflow-x-auto px-4 pb-1 text-xs font-bold text-neutral-400 sm:mx-0 sm:w-auto sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 sm:text-sm"
          aria-label="Console navigation"
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="whitespace-nowrap rounded-md px-2 py-1.5 transition-colors hover:text-neutral-50 sm:px-0 sm:py-0"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/console/access"
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1.5 transition-colors hover:text-neutral-50 sm:px-0 sm:py-0"
          >
            Approvals
            {pendingAccessCount > 0 ? (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-300 px-1.5 text-[11px] font-semibold leading-none text-neutral-950">
                {formatBadgeCount(pendingAccessCount)}
              </span>
            ) : null}
          </Link>
          {secondaryLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="hidden whitespace-nowrap transition-colors hover:text-neutral-50 md:inline"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
