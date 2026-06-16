import 'server-only';

import { dashboardFieldSources, hermesDashboardContractVersion } from './contract';
import { hermesDashboardSnapshot } from './mock-data';
import type { HermesDashboardSnapshot, RiskProfile } from './types';

type DashboardSnapshotInput = {
  riskProfile?: RiskProfile | null;
};

function cloneSnapshot(snapshot: HermesDashboardSnapshot): HermesDashboardSnapshot {
  return {
    ...snapshot,
    account: { ...snapshot.account },
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

export async function getHermesDashboardSnapshot({
  riskProfile,
}: DashboardSnapshotInput = {}): Promise<HermesDashboardSnapshot> {
  const snapshot = cloneSnapshot(hermesDashboardSnapshot);

  return {
    ...snapshot,
    contractVersion: hermesDashboardContractVersion,
    generatedAt: new Date().toISOString(),
    fieldSources: dashboardFieldSources.map((source) => ({ ...source })),
    status: {
      ...snapshot.status,
      riskProfile: riskProfile ?? snapshot.status.riskProfile,
    },
  };
}
