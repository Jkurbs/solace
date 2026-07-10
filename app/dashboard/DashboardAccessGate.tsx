'use client';

import Link from 'next/link';

import Mark from '@/app/Mark';
import DashboardThemeShell from '@/app/dashboard/DashboardThemeShell';
import DashboardThemeToggle from '@/app/dashboard/DashboardThemeToggle';

type AuthStatus = 'denied' | 'expired' | 'failed' | 'invalid' | 'sent' | undefined;

function getSafeNextPath(value: string | undefined) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return undefined;
  }

  return value;
}

function getStatusMessage(status: AuthStatus, email?: string) {
  switch (status) {
    case 'sent':
      return {
        tone: 'success' as const,
        text: `We sent a secure sign-in link${email ? ` to ${email}` : ''}.`,
      };
    case 'denied':
      return {
        tone: 'error' as const,
        text: 'That email is not attached to an approved Hermes account.',
      };
    case 'failed':
      return {
        tone: 'error' as const,
        text: 'We could not start the sign-in flow. Try again or contact Solace.',
      };
    case 'expired':
      return {
        tone: 'error' as const,
        text: 'That sign-in link is invalid or expired. Enter your email to receive a fresh link.',
      };
    case 'invalid':
      return {
        tone: 'error' as const,
        text: 'Enter the email address attached to your approved Hermes account.',
      };
    default:
      return null;
  }
}

export default function DashboardAccessGate({
  email,
  nextPath,
  status,
}: {
  email?: string;
  nextPath?: string;
  status?: AuthStatus;
}) {
  const message = getStatusMessage(status, email);
  const safeNextPath = getSafeNextPath(nextPath);

  return (
    <DashboardThemeShell>
      <header className="border-b border-neutral-200 bg-[#f7f5ef]/90 backdrop-blur dark:border-neutral-800 dark:bg-[#0a0a0a]/90">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-neutral-950 dark:text-neutral-50">
            <Mark size={22} />
            Solace
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/hermes"
              className="text-sm font-bold text-neutral-600 transition-colors hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-neutral-50"
            >
              Hermes
            </Link>
            <DashboardThemeToggle />
          </div>
        </div>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-73px)] max-w-md place-items-center px-5 py-16">
        <form
          action="/api/dashboard/access"
          method="post"
          className="w-full rounded-lg border border-neutral-200 bg-white p-6 shadow-xl shadow-neutral-900/5 dark:border-neutral-800 dark:bg-[#0d0d0b] dark:shadow-2xl dark:shadow-black/20"
        >
          <p className="text-sm font-medium uppercase tracking-[0.16em] text-neutral-500">Hermes access</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal text-neutral-950 dark:text-neutral-50">
            Enter Hermes
          </h1>
          <p className="mt-3 text-sm leading-6 text-neutral-600 dark:text-neutral-400">
            Use the email attached to your approved Solace account. We will send a secure sign-in link.
          </p>

          <label htmlFor="dashboard-email" className="mt-6 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Email
          </label>
          <input
            id="dashboard-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            defaultValue={email}
            className="mt-2 h-11 w-full rounded-md border border-neutral-300 bg-white px-3 text-base text-neutral-950 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-500 dark:border-neutral-700 dark:bg-[#0a0a0a] dark:text-neutral-50 dark:placeholder:text-neutral-600 dark:focus:border-neutral-400"
            placeholder="you@example.com"
          />
          {safeNextPath ? <input type="hidden" name="next" value={safeNextPath} /> : null}
          {message ? (
            <p
              className={`mt-3 text-sm ${message.tone === 'success' ? 'text-emerald-600 dark:text-emerald-300' : 'text-red-600 dark:text-red-300'}`}
              role={message.tone === 'success' ? 'status' : 'alert'}
            >
              {message.text}
            </p>
          ) : null}

          <button
            type="submit"
            className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-md bg-neutral-950 px-4 text-sm font-semibold text-neutral-50 transition-colors hover:bg-neutral-800 dark:bg-neutral-50 dark:text-neutral-950 dark:hover:bg-neutral-200"
          >
            Send sign-in link
          </button>

          <div className="mt-6 border-t border-neutral-200 pt-4 dark:border-neutral-800">
            <p className="text-xs leading-5 text-neutral-500">
              Hermes is currently available through a limited beta program. Access is tied to an approved Solace account.
            </p>
            <p className="mt-3 text-xs text-neutral-500">
              <Link href="/terms" className="transition-colors hover:text-neutral-700 dark:hover:text-neutral-300">
                Terms
              </Link>
              <span className="px-1.5 text-neutral-400 dark:text-neutral-700">·</span>
              <Link href="/privacy" className="transition-colors hover:text-neutral-700 dark:hover:text-neutral-300">
                Privacy
              </Link>
            </p>
          </div>
        </form>
      </section>
    </DashboardThemeShell>
  );
}