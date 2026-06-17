import 'server-only';

import { getLedgerReadModel } from '@/features/ledger/read-model';
import type { LedgerReadModel } from '@/features/ledger/types';

import { dashboardFieldSources, hermesDashboardContractVersion } from './contract';
import { hermesDashboardSnapshot } from './mock-data';
import type { AccountReview, HermesDashboardSnapshot, IdentityVerification, RiskProfile } from './types';

type DashboardSnapshotInput = {
  accountId?: string | null;
  accountReview?: AccountReview | null;
  depositIntentAmount?: number | null;
  identityVerification?: IdentityVerification | null;
  lifecycle?: HermesDashboardSnapshot['account']['lifecycle'];
  riskProfile?: RiskProfile | null;
};

function cloneSnapshot(snapshot: HermesDashboardSnapshot): HermesDashboardSnapshot {
  return {
    ...snapshot,
    account: {
      ...snapshot.account,
      depositIntent: snapshot.account.depositIntent ? { ...snapshot.account.depositIntent } : null,
      identityVerification: { ...snapshot.account.identityVerification },
      review: snapshot.account.review ? { ...snapshot.account.review } : null,
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
  {
    accountReview,
    depositIntentAmount,
    identityVerification,
    riskProfile,
  }: {
    accountReview: AccountReview | null | undefined;
    depositIntentAmount: number | null | undefined;
    identityVerification: IdentityVerification | null | undefined;
    riskProfile: RiskProfile;
  },
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
      identityVerification: identityVerification ?? {
        provider: 'stripe_identity',
        status: 'READY',
      },
      review: accountReview ?? null,
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
      { timestamp: updatedAt, summary: 'Account review submitted' },
      { timestamp: updatedAt, summary: 'Deposit intent recorded' },
    ],
    commentary:
      'Hermes is configured for the selected risk profile. Allocation begins after capital is received and the account is activated.',
  } satisfies HermesDashboardSnapshot;
}

function getActiveSnapshotFromLedger(
  baseSnapshot: HermesDashboardSnapshot,
  ledger: LedgerReadModel,
  riskProfile: RiskProfile,
): HermesDashboardSnapshot {
  const hermesActivity = ledger.activities.filter((activity) => activity.type === 'hermes_decision');
  const visibleActivity = hermesActivity.length ? hermesActivity : ledger.activities;

  return {
    ...baseSnapshot,
    account: {
      ...baseSnapshot.account,
      label: ledger.account.label,
      lifecycle: ledger.account.status === 'ACTIVE' ? 'ACTIVE' : 'AWAITING_DEPOSIT',
    },
    updatedAt: ledger.generatedAt,
    portfolio: {
      value: ledger.portfolio.value,
      deposited: ledger.portfolio.totalDeposited,
      profit: ledger.portfolio.netProfit,
      todaysChange: {
        amount: ledger.performance.todaysChange.amount,
        percentage: ledger.performance.todaysChange.percentage,
      },
      sinceInception: ledger.performance.sinceInception,
      availableToWithdraw: ledger.portfolio.availableToWithdraw,
    },
    status: {
      ...baseSnapshot.status,
      riskProfile,
      deployedCapital: ledger.allocation.capitalDeployed,
    },
    allocation: ledger.allocation.allocations,
    activity: visibleActivity.slice(0, 3).map((activity) => ({
      timestamp: activity.createdAt,
      summary: activity.message,
    })),
  };
}

export async function getHermesDashboardSnapshot({
  accountId,
  accountReview,
  depositIntentAmount,
  identityVerification,
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
    const pendingSnapshot = getAwaitingDepositSnapshot(baseSnapshot, {
      accountReview,
      depositIntentAmount,
      identityVerification,
      riskProfile: selectedRiskProfile,
    });

    if (!accountId) {
      return pendingSnapshot;
    }

    const ledger = await getLedgerReadModel(accountId);

    if (ledger.account.status === 'ACTIVE') {
      return getActiveSnapshotFromLedger(baseSnapshot, ledger, selectedRiskProfile);
    }

    return {
      ...pendingSnapshot,
      account: {
        ...pendingSnapshot.account,
        label: ledger.account.label,
      },
      updatedAt: ledger.generatedAt,
    };
  }

  const ledger = await getLedgerReadModel(accountId ?? undefined);

  return getActiveSnapshotFromLedger(baseSnapshot, ledger, selectedRiskProfile);
}
