'use client';

import { useEffect, useState } from 'react';

function formatAge(asOf: string, nowMs: number) {
  const then = new Date(asOf).getTime();
  if (!Number.isFinite(then)) return 'update time unknown';

  const ageMs = Math.max(0, nowMs - then);
  const minutes = Math.floor(ageMs / 60_000);

  if (minutes < 1) return 'updated just now';
  if (minutes < 60) return `updated ${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `updated ${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `updated ${days}d ago`;
}

export default function MarketReadingAge({ asOf }: { asOf: string }) {
  const [label, setLabel] = useState(() => formatAge(asOf, Date.now()));

  useEffect(() => {
    const tick = () => setLabel(formatAge(asOf, Date.now()));
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, [asOf]);

  return <span title={asOf}>Last update: {label}</span>;
}
