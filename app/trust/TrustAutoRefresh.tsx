'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// Keeps an open ledger tab current: re-fetches the server render on the same
// cadence as the page's ISR window, and only while the tab is visible.
const REFRESH_MS = 60_000;

export default function TrustAutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        router.refresh();
      }
    }, REFRESH_MS);

    return () => window.clearInterval(interval);
  }, [router]);

  return null;
}
