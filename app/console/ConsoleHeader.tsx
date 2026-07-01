import Link from 'next/link';

import Mark from '@/app/Mark';

import ConsoleLiveRefresh from './ConsoleLiveRefresh';

function formatBadgeCount(count: number) {
  return count > 9 ? '9+' : count.toString();
}

export default function ConsoleHeader({ pendingAccessCount = 0 }: { pendingAccessCount?: number }) {
  return (
    <header className="sticky top-0 z-30 border-b border-neutral-800 bg-[#10100e]/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-neutral-50">
          <Mark size={22} />
          Solace
        </Link>
        <div className="flex items-center gap-4">
          <ConsoleLiveRefresh />
          <nav className="flex items-center gap-4 text-sm font-bold text-neutral-400">
            <Link href="/console" className="transition-colors hover:text-neutral-50">
              Console
            </Link>
            <Link href="/console/bugops" className="transition-colors hover:text-neutral-50">
              BugOps
            </Link>
            <Link href="/console/social-observatory" className="transition-colors hover:text-neutral-50">
              Social
            </Link>
            <Link href="/console/access" className="inline-flex items-center gap-2 transition-colors hover:text-neutral-50">
              Approvals
              {pendingAccessCount > 0 ? (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-300 px-1.5 text-[11px] font-semibold leading-none text-neutral-950">
                  {formatBadgeCount(pendingAccessCount)}
                </span>
              ) : null}
            </Link>
            <Link href="/dashboard" className="hidden transition-colors hover:text-neutral-50 sm:inline">
              Dashboard
            </Link>
            <Link href="/dashboard/contract" className="hidden transition-colors hover:text-neutral-50 sm:inline">
              Contracts
            </Link>
            <Link href="/hermes" className="hidden transition-colors hover:text-neutral-50 md:inline">
              Hermes
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
