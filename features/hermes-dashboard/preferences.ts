import 'server-only';

import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';

import { riskProfileValues } from './contract';
import type { RiskProfile } from './types';

export const riskProfileCookieName = 'hermes_risk_profile';
export const dashboardOnboardingCookieName = 'hermes_onboarding_complete';
export const depositIntentAmountCookieName = 'hermes_deposit_intent_amount';

const riskProfiles = new Set<RiskProfile>(riskProfileValues);
const oneYear = 60 * 60 * 24 * 365;

export type DashboardOnboardingState = {
  complete: boolean;
  depositIntentAmount: number | null;
};

export async function getStoredRiskProfile() {
  const cookieStore = await cookies();
  const riskProfile = cookieStore.get(riskProfileCookieName)?.value as RiskProfile | undefined;

  return riskProfile && riskProfiles.has(riskProfile) ? riskProfile : null;
}

export async function getDashboardOnboardingState(): Promise<DashboardOnboardingState> {
  const cookieStore = await cookies();
  const complete = cookieStore.get(dashboardOnboardingCookieName)?.value === 'true';
  const depositIntentAmount = parseDepositIntentAmount(cookieStore.get(depositIntentAmountCookieName)?.value);

  return {
    complete,
    depositIntentAmount,
  };
}

export function isRiskProfile(value: unknown): value is RiskProfile {
  return typeof value === 'string' && riskProfiles.has(value as RiskProfile);
}

export function parseDepositIntentAmount(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const amount = Number(value.replace(/,/g, ''));

  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return Math.round(amount * 100) / 100;
}

export function setRiskProfilePreference(response: NextResponse, riskProfile: RiskProfile) {
  response.cookies.set(riskProfileCookieName, riskProfile, {
    httpOnly: true,
    maxAge: oneYear,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
}

export function completeDashboardOnboarding(
  response: NextResponse,
  { depositIntentAmount, riskProfile }: { depositIntentAmount: number; riskProfile: RiskProfile },
) {
  setRiskProfilePreference(response, riskProfile);
  response.cookies.set(dashboardOnboardingCookieName, 'true', {
    httpOnly: true,
    maxAge: oneYear,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
  response.cookies.set(depositIntentAmountCookieName, String(depositIntentAmount), {
    httpOnly: true,
    maxAge: oneYear,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
}

export function expireDashboardOnboarding(response: NextResponse) {
  response.cookies.set(dashboardOnboardingCookieName, '', {
    maxAge: 0,
    path: '/',
  });
  response.cookies.set(depositIntentAmountCookieName, '', {
    maxAge: 0,
    path: '/',
  });
}
