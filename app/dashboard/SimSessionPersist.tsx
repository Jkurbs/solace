'use client';

import { useEffect } from 'react';

const SIM_SESSION_STORAGE_KEY = 'hermes_sim_session_v1';
const CLIENT_COOKIE = 'hermes_sim_session_client';

/**
 * Mirror the client-readable sim session cookie into localStorage so return
 * visits work after cookie loss on the same device.
 */
export default function SimSessionPersist() {
  useEffect(() => {
    try {
      const match = document.cookie
        .split(';')
        .map((part) => part.trim())
        .find((part) => part.startsWith(`${CLIENT_COOKIE}=`));

      if (!match) return;

      const value = decodeURIComponent(match.slice(CLIENT_COOKIE.length + 1));
      const parsed = JSON.parse(value) as { version?: number; sessionId?: string };

      if (parsed?.version === 1 && typeof parsed.sessionId === 'string') {
        window.localStorage.setItem(SIM_SESSION_STORAGE_KEY, value);
        window.localStorage.setItem('hermes_sim_started', '1');
      }
    } catch {
      // ignore parse / storage failures
    }
  }, []);

  return null;
}
