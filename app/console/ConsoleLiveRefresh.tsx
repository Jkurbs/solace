'use client';

import { useEffect, useState } from 'react';

const refreshIntervalMs = 5_000;

const timeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  hour12: true,
  minute: '2-digit',
  second: '2-digit',
});

export default function ConsoleLiveRefresh() {
  const [lastTick, setLastTick] = useState('');

  useEffect(() => {
    function updateTick() {
      setLastTick(timeFormatter.format(new Date()));
    }

    updateTick();

    const interval = window.setInterval(updateTick, refreshIntervalMs);
    window.addEventListener('focus', updateTick);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', updateTick);
    };
  }, []);

  return (
    <div className="hidden items-center gap-2 rounded-full border border-neutral-800 bg-neutral-950/40 px-3 py-1.5 text-xs text-neutral-400 sm:inline-flex">
      <span
        aria-hidden="true"
        className="h-1.5 w-1.5 rounded-full bg-emerald-300"
      />
      <span>Live panels</span>
      <span className="text-neutral-600">5s</span>
      {lastTick ? <span className="text-neutral-600">{lastTick}</span> : null}
    </div>
  );
}
