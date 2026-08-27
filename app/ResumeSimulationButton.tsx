'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { resumeGuestSimulation } from '@/features/hermes-dashboard/sim-session-client';
import { cn } from '@/lib/utils';

/**
 * Returning-device CTA: open the simulation this browser already started.
 * First-visit CTAs stay "Run a simulation"; this replaces them after a prior session.
 */
export default function ResumeSimulationButton({ className }: { className?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      className={cn('btn-shimmer', pending && 'is-shimmering', className)}
      disabled={pending}
      aria-busy={pending || undefined}
      aria-label="Open the simulation dashboard you started on this device"
      onClick={async () => {
        if (pending) return;
        setPending(true);
        const result = await resumeGuestSimulation();
        if (result === 'opened') {
          router.push('/dashboard');
          return;
        }
        setPending(false);
      }}
    >
      {pending ? 'Opening…' : 'Open dashboard'}
    </button>
  );
}
