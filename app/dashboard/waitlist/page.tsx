import type { Metadata } from 'next';
import Link from 'next/link';

import Mark from '@/app/Mark';
import { hasDashboardAccess } from '@/features/hermes-dashboard/access';
import { getAppOrigin } from '@/lib/app-origin';

import DashboardAccessGate from '../DashboardAccessGate';
import DashboardThemeShell from '../DashboardThemeShell';
import DashboardThemeToggle from '../DashboardThemeToggle';
import WaitlistForm from './waitlist-form';

export const metadata: Metadata = {
  title: 'Solace · Join the waitlist',
  description: 'Ask to be considered when Hermes opens to capital outside founder funds. You cannot invest yet.',
};

export const dynamic = 'force-dynamic';

type WaitlistPageProps = {
  searchParams?: Promise<{
    auth?: string | string[];
    email?: string | string[];
    next?: string | string[];
  }>;
};

export default async function WaitlistPage({ searchParams }: WaitlistPageProps) {
  const accessGranted = await hasDashboardAccess();

  if (!accessGranted) {
    const params = await searchParams;
    const status = Array.isArray(params?.auth) ? params.auth[0] : params?.auth;
    const email = Array.isArray(params?.email) ? params.email[0] : params?.email;
    const nextPath = Array.isArray(params?.next) ? params.next[0] : params?.next;

    return (
      <DashboardAccessGate
        email={email}
        nextPath={nextPath}
        status={
          status === 'denied' ||
          status === 'expired' ||
          status === 'failed' ||
          status === 'invalid' ||
          status === 'sent'
            ? status
            : undefined
        }
      />
    );
  }

  return (
    <DashboardThemeShell>
      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-[#f7f5ef]/90 backdrop-blur dark:border-neutral-800 dark:bg-[#0a0a0a]/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <a href={getAppOrigin()} className="solace-wordmark text-neutral-950 dark:text-neutral-50">
            <Mark size={22} />
            Solace
          </a>
          <div className="flex items-center gap-3 text-sm">
            <Link
              href="/dashboard"
              className="font-medium text-neutral-700 underline decoration-transparent underline-offset-4 hover:text-neutral-950 hover:decoration-neutral-400 dark:text-neutral-300 dark:hover:text-neutral-50"
            >
              Back to dashboard
            </Link>
            <DashboardThemeToggle />
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <WaitlistForm />
      </div>
    </DashboardThemeShell>
  );
}
