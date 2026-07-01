import Link from 'next/link';

import Mark from '@/app/Mark';

import ConsoleLiveRefresh from './ConsoleLiveRefresh';

function formatBadgeCount(count: number) {
  return count > 9 ? '9+' : count.toString();
}

export default function ConsoleHeader({ pendingAccessCount = 0 }: { pendingAccessCount?: number }) {
  return (
    <header className="sticky top-0 z-30 border-b border-neutral-800 bg-[#10100e]/90 backdrop-blur">
      <div className="mx-auto grid max-w-7xl gap-3 px-4 py-3 sm:flex sm:items-center sm:justify-between sm:px-6 sm:py-4 lg:px-8">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-neutral-50">
            <Mark size={22} />
            Solace
          </Link>
          <ConsoleLiveRefresh />
        </div>
        <nav className="grid grid-cols-4 items-center gap-2 text-center text-xs font-bold text-neutral-400 sm:flex sm:gap-4 sm:text-left sm:text-sm">
          <Link href="/console" className="rounded-md border border-neutral-800 bg-neutral-950/30 px-2 py-2 transition-colors hover:text-neutral-50 sm:border-0 sm:bg-transparent sm:p-0">
            Console
          </Link>
          <Link href="/console/bugops" className="rounded-md border border-neutral-800 bg-neutral-950/30 px-2 py-2 transition-colors hover:text-neutral-50 sm:border-0 sm:bg-transparent sm:p-0">
            BugOps
          </Link>
          <Link href="/console/social-observatory" className="rounded-md border border-neutral-800 bg-neutral-950/30 px-2 py-2 transition-colors hover:text-neutral-50 sm:border-0 sm:bg-transparent sm:p-0">
            Social
          </Link>
          <Link href="/console/access" className="inline-flex items-center justify-center gap-1.5 rounded-md border border-neutral-800 bg-neutral-950/30 px-2 py-2 transition-colors hover:text-neutral-50 sm:border-0 sm:bg-transparent sm:p-0">
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
    </header>
  );
}
