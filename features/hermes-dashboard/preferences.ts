import 'server-only';

import { cookies } from 'next/headers';

import { riskProfileValues } from './contract';
import type { RiskProfile } from './types';

export const riskProfileCookieName = 'hermes_risk_profile';

const riskProfiles = new Set<RiskProfile>(riskProfileValues);

export async function getStoredRiskProfile() {
  const cookieStore = await cookies();
  const riskProfile = cookieStore.get(riskProfileCookieName)?.value as RiskProfile | undefined;

  return riskProfile && riskProfiles.has(riskProfile) ? riskProfile : null;
}

export function isRiskProfile(value: unknown): value is RiskProfile {
  return typeof value === 'string' && riskProfiles.has(value as RiskProfile);
}
