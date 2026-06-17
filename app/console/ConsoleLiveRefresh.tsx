'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

const refreshIntervalMs = 10_000;

const timeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  hour12: true,
  minute: '2-digit',
  second: '2-digit',
});

export default function ConsoleLiveRefresh() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [lastRefresh, setLastRefresh] = useState('');

  useEffect(() => {
    let mounted = true;

    function refreshConsole() {
      if (document.visibilityState !== 'visible') {
        return;
      }

      startTransition(() => {
        router.refresh();
      });

      if (mounted) {
        setLastRefresh(timeFormatter.format(new Date()));
      }
    }

    setLastRefresh(timeFormatter.format(new Date()));

    const interval = window.setInterval(refreshConsole, refreshIntervalMs);
    window.addEventListener('focus', refreshConsole);
    document.addEventListener('visibilitychange', refreshConsole);

    return () => {
      mounted = false;
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshConsole);
      document.removeEventListener('visibilitychange', refreshConsole);
    };
  }, [router]);

  return (
    <div className="hidden items-center gap-2 rounded-full border border-neutral-800 bg-neutral-950/40 px-3 py-1.5 text-xs text-neutral-400 sm:inline-flex">
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 rounded-full ${isPending ? 'bg-amber-300' : 'bg-emerald-300'}`}
      />
      <span>{isPending ? 'Refreshing' : 'Live refresh'}</span>
      <span className="text-neutral-600">10s</span>
      {lastRefresh ? <span className="text-neutral-600">{lastRefresh}</span> : null}
    </div>
  );
}
