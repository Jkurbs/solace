'use client';

import { useEffect } from 'react';

import { persistSimSession, readCookieSimSession } from '@/features/hermes-dashboard/sim-session-client';

/**
 * Mirror the client-readable sim session cookie into localStorage so return
 * visits work after cookie loss on the same device.
 */
export default function SimSessionPersist() {
  useEffect(() => {
    const session = readCookieSimSession();
    if (session) {
      persistSimSession(session);
    }
  }, []);

  return null;
}
