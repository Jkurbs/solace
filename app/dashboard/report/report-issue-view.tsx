'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';

import Mark from '@/app/Mark';
import IssueReportPanel from '@/features/hermes-dashboard/issue-report-panel';
import { cn } from '@/lib/utils';

type DashboardTheme = 'dark' | 'light';

export default function ReportIssueView() {
  const [theme, setTheme] = useState<DashboardTheme>('dark');

  useEffect(() => {
    const storedTheme = window.localStorage.getItem('hermes_dashboard_theme');

    if (storedTheme === 'dark' || storedTheme === 'light') {
      setTheme(storedTheme);
    }
  }, []);

  return (
    <main
      className={cn(
        theme === 'dark' && 'dark',
        'min-h-screen transition-colors',
        theme === 'dark' ? 'bg-[#10100e] text-neutral-50' : 'bg-[#f7f5ef] text-neutral-950',
      )}
    >
      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-[#f7f5ef]/90 backdrop-blur dark:border-neutral-800 dark:bg-[#10100e]/90">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-neutral-950 dark:text-neutral-50">
            <Mark size={22} />
            Solace
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-neutral-300 px-3 text-sm font-bold text-neutral-700 transition-colors hover:border-neutral-400 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-500 dark:hover:bg-neutral-900"
          >
            <ArrowLeft size={15} aria-hidden="true" />
            Back to dashboard
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-6">
          <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Report a bug</p>
          <h1 className="mt-1 text-2xl font-semibold text-neutral-950 dark:text-neutral-50">
            Tell us what went wrong
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-neutral-600 dark:text-neutral-400">
            The more detail you give, the faster it gets triaged. Screenshots and reproduction steps help most.
          </p>
        </div>

        <IssueReportPanel />
      </div>
    </main>
  );
}
