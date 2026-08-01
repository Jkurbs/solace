'use client';

import { useEffect, useState } from 'react';

function formatAge(asOf: string, nowMs: number) {
  const then = new Date(asOf).getTime();
  if (!Number.isFinite(then)) return 'Updated time unknown';

  const ageMs = Math.max(0, nowMs - then);
  const minutes = Math.floor(ageMs / 60_000);

  if (minutes < 1) return 'Updated just now';
  if (minutes === 1) return 'Updated 1 min ago';
  if (minutes < 60) return `Updated ${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours === 1) return 'Updated 1 hour ago';
  if (hours < 48) return `Updated ${hours} hours ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return 'Updated 1 day ago';
  return `Updated ${days} days ago`;
}

export default function MarketReadingAge({ asOf }: { asOf: string }) {
  const [label, setLabel] = useState(() => formatAge(asOf, Date.now()));

  useEffect(() => {
    const tick = () => setLabel(formatAge(asOf, Date.now()));
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, [asOf]);

  return <span title={asOf}>{label}</span>;
}
