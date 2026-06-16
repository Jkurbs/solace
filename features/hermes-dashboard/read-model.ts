import 'server-only';

import { dashboardFieldSources, hermesDashboardContractVersion } from './contract';
import { hermesDashboardSnapshot } from './mock-data';
import type { HermesDashboardSnapshot, RiskProfile } from './types';

type DashboardSnapshotInput = {
  depositIntentAmount?: number | null;
  lifecycle?: HermesDashboardSnapshot['account']['lifecycle'];
  riskProfile?: RiskProfile | null;
};

function cloneSnapshot(snapshot: HermesDashboardSnapshot): HermesDashboardSnapshot {
  return {
    ...snapshot,
    account: {
      ...snapshot.account,
      depositIntent: snapshot.account.depositIntent ? { ...snapshot.account.depositIntent } : null,
    },
    fieldSources: snapshot.fieldSources.map((source) => ({ ...source })),
    portfolio: {
      ...snapshot.portfolio,
      todaysChange: { ...snapshot.portfolio.todaysChange },
    },
    status: { ...snapshot.status },
    outlook: { ...snapshot.outlook },
    allocation: snapshot.allocation.map((item) => ({ ...item })),
    activity: snapshot.activity.map((item) => ({ ...item })),
  };
}

function getAwaitingDepositSnapshot(
  snapshot: HermesDashboardSnapshot,
  { depositIntentAmount, riskProfile }: { depositIntentAmount: number | null | undefined; riskProfile: RiskProfile },
) {
  const updatedAt = new Date().toISOString();
  const amount = depositIntentAmount ?? 0;

  return {
    ...snapshot,
    account: {
      label: 'Pending account',
      lifecycle: 'AWAITING_DEPOSIT',
      depositIntent: {
        amount,
        status: 'REVIEW_PENDING',
      },
    },
    updatedAt,
    portfolio: {
      value: 0,
      deposited: 0,
      profit: 0,
      todaysChange: {
        amount: 0,
        percentage: 0,
      },
      sinceInception: 0,
      availableToWithdraw: 0,
    },
    status: {
      status: 'WAIT',
      riskProfile,
      deployedCapital: 0,
      conviction: 'LOW',
    },
    outlook: {
      environment: 'Moderate',
      stance: 'Awaiting activation',
      note: 'Hermes is configured and will begin evaluating allocation once capital is received and the account is activated.',
    },
    allocation: [{ asset: 'Cash', percentage: 100 }],
    activity: [
      { timestamp: updatedAt, summary: `${riskProfile} risk profile selected` },
      { timestamp: updatedAt, summary: 'Deposit intent recorded' },
    ],
    commentary:
      'Hermes is configured for the selected risk profile. Allocation begins after capital is received and the account is activated.',
  } satisfies HermesDashboardSnapshot;
}

export async function getHermesDashboardSnapshot({
  depositIntentAmount,
  lifecycle = 'ACTIVE',
  riskProfile,
}: DashboardSnapshotInput = {}): Promise<HermesDashboardSnapshot> {
  const snapshot = cloneSnapshot(hermesDashboardSnapshot);
  const selectedRiskProfile = riskProfile ?? snapshot.status.riskProfile;
  const baseSnapshot = {
    ...snapshot,
    contractVersion: hermesDashboardContractVersion,
    generatedAt: new Date().toISOString(),
    fieldSources: dashboardFieldSources.map((source) => ({ ...source })),
  };

  if (lifecycle === 'AWAITING_DEPOSIT') {
    return getAwaitingDepositSnapshot(baseSnapshot, { depositIntentAmount, riskProfile: selectedRiskProfile });
  }

  return {
    ...baseSnapshot,
    status: {
      ...snapshot.status,
      riskProfile: selectedRiskProfile,
    },
  };
}
