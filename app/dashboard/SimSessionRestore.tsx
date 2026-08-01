'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const SIM_SESSION_STORAGE_KEY = 'hermes_sim_session_v1';

type StoredSimSession = {
  version: 1;
  sessionId: string;
  startedAt: string;
  depositAmount: number;
  riskProfile: string;
};

function readStoredSimSession(): StoredSimSession | null {
  try {
    const raw = window.localStorage.getItem(SIM_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredSimSession>;
    if (
      parsed?.version !== 1 ||
      typeof parsed.sessionId !== 'string' ||
      typeof parsed.startedAt !== 'string' ||
      typeof parsed.depositAmount !== 'number' ||
      typeof parsed.riskProfile !== 'string'
    ) {
      return null;
    }
    return parsed as StoredSimSession;
  } catch {
    return null;
  }
}

/**
 * When cookies are missing but this device already ran a simulation, rehydrate
 * the guest session without credentials and return to the dashboard.
 */
export default function SimSessionRestore() {
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'restoring' | 'failed'>('idle');

  useEffect(() => {
    const stored = readStoredSimSession();
    if (!stored) return;

    let cancelled = false;
    setStatus('restoring');

    (async () => {
      try {
        const response = await fetch('/api/dashboard/onboarding/open-simulation', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ restore: true, session: stored }),
          credentials: 'same-origin',
        });

        if (cancelled) return;

        if (!response.ok) {
          setStatus('failed');
          return;
        }

        const payload = (await response.json().catch(() => null)) as { ok?: boolean; session?: StoredSimSession } | null;
        if (payload?.ok === false) {
          setStatus('failed');
          return;
        }

        if (payload?.session) {
          try {
            window.localStorage.setItem(SIM_SESSION_STORAGE_KEY, JSON.stringify(payload.session));
            window.localStorage.setItem('hermes_sim_started', '1');
          } catch {
            // ignore
          }
        }

        router.replace('/dashboard');
        router.refresh();
      } catch {
        if (!cancelled) setStatus('failed');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (status === 'idle') {
    return null;
  }

  if (status === 'restoring') {
    return (
      <p className="rounded-md border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-600 dark:border-neutral-800 dark:bg-[#0d0d0b] dark:text-neutral-300" role="status">
        Welcome back. Opening your simulation on this device…
      </p>
    );
  }

  return (
    <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100" role="status">
      We could not restore your previous simulation automatically. You can start again below; nothing was at risk.
    </p>
  );
}
