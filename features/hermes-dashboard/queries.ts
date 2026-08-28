import { clearPersistedSimSession } from './sim-session-client';
import type { HermesDashboardSnapshot, MoneyMovementType, RiskProfile } from './types';

export const hermesDashboardQueryKey = ['hermes-dashboard', 'snapshot'] as const;

export type SubmitBugReportPayload = {
  browser?: string;
  canReproduce?: 'yes' | 'sometimes' | 'no' | 'unknown';
  device?: string;
  expectedBehavior?: string;
  pageUrl?: string;
  screenshotUrl?: string;
  seriousness?: string;
  stepsToReproduce?: string[];
  summary?: string;
  whatHappened: string;
};

export type SubmitBugReportResponse = {
  displayId: string;
  message: string;
  missingInfo: string[];
  severity: 'P0' | 'P1' | 'P2' | 'P3';
  status: string;
  title: string;
};

/**
 * A missed live mark used to publish deposit as equity ($10k), then the next
 * tick restored the real book ($650). Hold the previous book across that blink.
 */
export function stabilizeSimulationEquity(
  previous: HermesDashboardSnapshot | undefined,
  next: HermesDashboardSnapshot,
): HermesDashboardSnapshot {
  if (!previous || previous.account.mode !== 'SIMULATION' || next.account.mode !== 'SIMULATION') {
    return next;
  }

  const deposited = next.portfolio.deposited;
  if (!(deposited > 0)) {
    return next;
  }

  const snappedToDeposit = Math.abs(next.portfolio.value - deposited) <= 1;
  const previousWasLive = Math.abs(previous.portfolio.value - deposited) > Math.max(25, deposited * 0.05);
  const jumpRatio =
    Math.abs(next.portfolio.value - previous.portfolio.value) / Math.max(Math.abs(previous.portfolio.value), 1);

  if (!snappedToDeposit || !previousWasLive || jumpRatio < 0.5) {
    return next;
  }

  return {
    ...next,
    portfolio: {
      ...next.portfolio,
      allocatedCapital: previous.portfolio.allocatedCapital,
      availableBalance: previous.portfolio.availableBalance,
      availableToWithdraw: previous.portfolio.availableToWithdraw,
      cashBalance: previous.portfolio.cashBalance,
      profit: previous.portfolio.profit,
      realizedPnl: previous.portfolio.realizedPnl,
      sinceInception: previous.portfolio.sinceInception,
      unrealizedPnl: previous.portfolio.unrealizedPnl,
      value: previous.portfolio.value,
      withdrawable: previous.portfolio.withdrawable,
    },
  };
}

export async function getHermesDashboardSnapshot(): Promise<HermesDashboardSnapshot> {
  const response = await fetch('/api/dashboard', {
    cache: 'no-store',
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

export async function startMoneyMovement(type: MoneyMovementType, amount?: number) {
  const response = await fetch('/api/dashboard/money-movement', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ amount, type }),
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

export async function startIdentityVerification() {
  const response = await fetch('/api/stripe/identity-session', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
    },
  });
  const payload = (await response.json()) as { message?: string; url?: string };

  if (!response.ok) {
    throw new Error(payload.message ?? 'Identity verification could not be started.');
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

  // Clear device-local simulation identity so "Run a simulation" can start fresh.
  clearPersistedSimSession();

  window.location.assign(payload.url ?? '/');

  return payload;
}

export async function submitBugReport(payload: SubmitBugReportPayload) {
  const response = await fetch('/api/bug-report', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const responsePayload = (await response.json()) as SubmitBugReportResponse | { message?: string };

  if (!response.ok) {
    throw new Error(responsePayload.message ?? 'Bug report could not be submitted.');
  }

  return responsePayload as SubmitBugReportResponse;
}
