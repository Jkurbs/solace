'use client';

import { useEffect, useState } from 'react';

/** Keep in sync with `sim-session.ts` (server-only). */
export const SIM_SESSION_STORAGE_KEY = 'hermes_sim_session_v1';
export const SIM_STARTED_KEY = 'hermes_sim_started';
export const SIM_SESSION_CLIENT_COOKIE = 'hermes_sim_session_client';

const SIM_SESSION_CHANGE_EVENT = 'hermes-sim-session-change';

export type StoredSimSession = {
  version: 1;
  sessionId: string;
  startedAt: string;
  depositAmount: number;
  riskProfile: string;
};

function notifySimSessionChange() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(SIM_SESSION_CHANGE_EVENT));
}

function parseStoredSimSession(value: unknown): StoredSimSession | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const parsed = value as Partial<StoredSimSession>;
  if (
    parsed.version !== 1 ||
    typeof parsed.sessionId !== 'string' ||
    typeof parsed.startedAt !== 'string' ||
    typeof parsed.depositAmount !== 'number' ||
    typeof parsed.riskProfile !== 'string'
  ) {
    return null;
  }

  return parsed as StoredSimSession;
}

function readCookieValue(name: string): string | null {
  if (typeof document === 'undefined') return null;

  const prefix = `${name}=`;
  const match = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));

  if (!match) return null;

  try {
    return decodeURIComponent(match.slice(prefix.length));
  } catch {
    return null;
  }
}

export function readCookieSimSession(): StoredSimSession | null {
  const raw = readCookieValue(SIM_SESSION_CLIENT_COOKIE);
  if (!raw) return null;

  try {
    return parseStoredSimSession(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function readStoredSimSession(): StoredSimSession | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(SIM_SESSION_STORAGE_KEY);
    const fromStorage = raw ? parseStoredSimSession(JSON.parse(raw)) : null;
    if (fromStorage) return fromStorage;
  } catch {
    // storage blocked or corrupt
  }

  return readCookieSimSession();
}

export function hasLegacySimStarted() {
  if (typeof window === 'undefined') return false;

  try {
    return window.localStorage.getItem(SIM_STARTED_KEY) === '1';
  } catch {
    return false;
  }
}

export function hasGuestSimSession() {
  return Boolean(readStoredSimSession()) || hasLegacySimStarted();
}

export function persistSimSession(session: StoredSimSession) {
  try {
    window.localStorage.setItem(SIM_SESSION_STORAGE_KEY, JSON.stringify(session));
    window.localStorage.setItem(SIM_STARTED_KEY, '1');
    notifySimSessionChange();
  } catch {
    // storage blocked
  }
}

export function clearPersistedSimSession() {
  try {
    window.localStorage.removeItem(SIM_SESSION_STORAGE_KEY);
    window.localStorage.removeItem(SIM_STARTED_KEY);
    notifySimSessionChange();
  } catch {
    // ignore
  }
}

export function useHasGuestSimSession() {
  const [hasSim, setHasSim] = useState(false);

  useEffect(() => {
    const sync = () => setHasSim(hasGuestSimSession());
    sync();
    window.addEventListener('storage', sync);
    window.addEventListener(SIM_SESSION_CHANGE_EVENT, sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener(SIM_SESSION_CHANGE_EVENT, sync);
    };
  }, []);

  return hasSim;
}

export async function restoreGuestSimSession(
  stored: StoredSimSession,
): Promise<'opened' | 'invalid' | 'failed'> {
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

    if (response.status === 400) {
      clearPersistedSimSession();
      return 'invalid';
    }

    // Open access closed: the dashboard gate is the next honest step.
    if (response.status === 403) {
      return 'opened';
    }

    if (!response.ok) {
      return 'failed';
    }

    const payload = (await response.json().catch(() => null)) as {
      ok?: boolean;
      session?: StoredSimSession;
    } | null;

    if (payload?.ok === false) {
      return 'failed';
    }

    persistSimSession(payload?.session ?? stored);
    return 'opened';
  } catch {
    return 'failed';
  }
}

/**
 * Rehydrate guest cookies if needed, then the caller can send the user to /dashboard.
 * If this device already has the client session cookie, skip the network round-trip.
 */
export async function resumeGuestSimulation(): Promise<'opened' | 'invalid' | 'failed'> {
  const stored = readStoredSimSession();

  if (!stored) {
    return hasLegacySimStarted() ? 'opened' : 'invalid';
  }

  if (readCookieSimSession()) {
    return 'opened';
  }

  return restoreGuestSimSession(stored);
}
