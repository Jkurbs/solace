import type { HermesDashboardSnapshot, MoneyMovementType, RiskProfile } from './types';

export const hermesDashboardQueryKey = ['hermes-dashboard', 'snapshot'] as const;

export async function getHermesDashboardSnapshot(): Promise<HermesDashboardSnapshot> {
  const response = await fetch('/api/dashboard', {
    headers: {
      Accept: 'application/json',
    },
  });
  const payload = (await response.json()) as HermesDashboardSnapshot | { message?: string };

  if (!response.ok) {
    throw new Error('message' in payload ? payload.message : 'Dashboard snapshot could not be loaded.');
  }

  return payload as HermesDashboardSnapshot;
}

export async function updateRiskProfile(riskProfile: RiskProfile) {
  const response = await fetch('/api/dashboard/risk-profile', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ riskProfile }),
  });
  const payload = (await response.json()) as { message?: string; riskProfile?: RiskProfile };

  if (!response.ok || !payload.riskProfile) {
    throw new Error(payload.message ?? 'Risk profile could not be updated.');
  }

  return payload.riskProfile;
}

export async function startMoneyMovement(type: MoneyMovementType) {
  const response = await fetch('/api/dashboard/money-movement', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type }),
  });
  const payload = (await response.json()) as { message?: string; url?: string };

  if (!response.ok) {
    throw new Error(payload.message ?? 'Money movement is unavailable.');
  }

  if (payload.url) {
    window.location.assign(payload.url);
  }

  return payload;
}

export async function logoutUser() {
  const response = await fetch('/api/auth/logout', {
    method: 'POST',
  });
  const payload = (await response.json().catch(() => ({}))) as { message?: string; url?: string };

  if (!response.ok) {
    throw new Error(payload.message ?? 'Logout failed.');
  }

  window.location.assign(payload.url ?? '/');

  return payload;
}
