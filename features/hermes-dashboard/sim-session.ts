import 'server-only';

import { randomUUID } from 'crypto';
import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';

import type { RiskProfile } from './types';

/** Durable guest simulation identity (no credentials). */
export const simSessionIdCookieName = 'hermes_sim_session_id';
export const simStartedAtCookieName = 'hermes_sim_started_at';
/**
 * Non-httpOnly mirror so the browser can rehydrate localStorage after a form POST.
 * Same device-bound guest identity as the httpOnly cookies (no real funds).
 */
export const simSessionClientCookieName = 'hermes_sim_session_client';

/** Client localStorage key for return visits on this device. */
export const SIM_SESSION_STORAGE_KEY = 'hermes_sim_session_v1';

const oneYear = 60 * 60 * 24 * 365;
const allowedDeposits = new Set([10_000, 50_000, 100_000]);
const riskProfiles = new Set<RiskProfile>(['Preservation', 'Balanced', 'Velocity']);

export type GuestSimSession = {
  depositAmount: number;
  riskProfile: RiskProfile;
  sessionId: string;
  startedAt: string;
};

/** Shape written to localStorage so a returning browser can rehydrate cookies. */
export type GuestSimSessionClientPayload = GuestSimSession & {
  version: 1;
};

function cookieOptions(maxAge = oneYear) {
  return {
    httpOnly: true,
    maxAge,
    path: '/',
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
  };
}

function isIsoDate(value: string) {
  const ms = new Date(value).getTime();
  return Number.isFinite(ms);
}

export function isAllowedSimDeposit(amount: number) {
  return allowedDeposits.has(amount);
}

export function createGuestSimSession({
  depositAmount,
  riskProfile = 'Balanced',
  startedAt = new Date().toISOString(),
  sessionId = randomUUID(),
}: {
  depositAmount: number;
  riskProfile?: RiskProfile;
  sessionId?: string;
  startedAt?: string;
}): GuestSimSession {
  const amount = isAllowedSimDeposit(depositAmount) ? depositAmount : 10_000;
  const profile = riskProfiles.has(riskProfile) ? riskProfile : 'Balanced';
  const started = isIsoDate(startedAt) ? new Date(startedAt).toISOString() : new Date().toISOString();

  return {
    depositAmount: amount,
    riskProfile: profile,
    sessionId: sessionId.trim() || randomUUID(),
    startedAt: started,
  };
}

export function parseGuestSimSessionClientPayload(value: unknown): GuestSimSession | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const raw = value as Record<string, unknown>;
  const depositAmount = Number(raw.depositAmount);
  const riskProfile = typeof raw.riskProfile === 'string' ? (raw.riskProfile as RiskProfile) : null;
  const sessionId = typeof raw.sessionId === 'string' ? raw.sessionId.trim() : '';
  const startedAt = typeof raw.startedAt === 'string' ? raw.startedAt.trim() : '';

  if (!isAllowedSimDeposit(depositAmount) || !riskProfile || !riskProfiles.has(riskProfile)) {
    return null;
  }

  if (!sessionId || sessionId.length < 8 || sessionId.length > 80) {
    return null;
  }

  if (!isIsoDate(startedAt)) {
    return null;
  }

  // Reject future-dated starts (clock skew / tamper).
  if (new Date(startedAt).getTime() > Date.now() + 60_000) {
    return null;
  }

  return createGuestSimSession({
    depositAmount,
    riskProfile,
    sessionId,
    startedAt,
  });
}

export function toClientSimSessionPayload(session: GuestSimSession): GuestSimSessionClientPayload {
  return {
    version: 1,
    ...session,
  };
}

export function applyGuestSimSessionCookies(response: NextResponse, session: GuestSimSession) {
  response.cookies.set(simSessionIdCookieName, session.sessionId, cookieOptions());
  response.cookies.set(simStartedAtCookieName, session.startedAt, cookieOptions());
  response.cookies.set(simSessionClientCookieName, encodeURIComponent(JSON.stringify(toClientSimSessionPayload(session))), {
    httpOnly: false,
    maxAge: oneYear,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
}

export function expireGuestSimSessionCookies(response: NextResponse) {
  response.cookies.set(simSessionIdCookieName, '', { maxAge: 0, path: '/' });
  response.cookies.set(simStartedAtCookieName, '', { maxAge: 0, path: '/' });
  response.cookies.set(simSessionClientCookieName, '', { maxAge: 0, path: '/' });
}

export async function getGuestSimSessionFromCookies({
  depositAmount,
  riskProfile,
}: {
  depositAmount?: number | null;
  riskProfile?: RiskProfile | null;
} = {}): Promise<GuestSimSession | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(simSessionIdCookieName)?.value?.trim() ?? '';
  const startedAt = cookieStore.get(simStartedAtCookieName)?.value?.trim() ?? '';
  const amount = depositAmount ?? null;
  const profile = riskProfile ?? 'Balanced';

  if (!sessionId || !startedAt || !isIsoDate(startedAt) || amount === null || !isAllowedSimDeposit(amount)) {
    return null;
  }

  return createGuestSimSession({
    depositAmount: amount,
    riskProfile: profile ?? 'Balanced',
    sessionId,
    startedAt,
  });
}
