import 'server-only';

import { getPoolAccountProjection } from '@/features/ledger/pool-units';
import { getLedgerReadModel } from '@/features/ledger/read-model';
import type { LedgerReadModel, PoolAccountProjection } from '@/features/ledger/types';

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
      pool: snapshot.portfolio.pool ? { ...snapshot.portfolio.pool } : undefined,
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
      allocatedCapital: 0,
      availableBalance: 0,
      cashBalance: 0,
      fees: 0,
      funding: 0,
      openPnlIncluded: false,
      realizedPnl: 0,
      reservedMargin: 0,
      unrealizedPnl: 0,
      withdrawable: 0,
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

function getPendingAccountLabel(accountId: string) {
  return `Account ending ${accountId.replace(/[^a-z0-9]/gi, '').slice(-4).toUpperCase()}`;
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function roundPercent(value: number) {
  return Math.round(value * 100) / 100;
}

function getActiveSnapshotFromLedger(
  baseSnapshot: HermesDashboardSnapshot,
  ledger: LedgerReadModel,
  riskProfile: RiskProfile,
  poolProjection: PoolAccountProjection | null,
): HermesDashboardSnapshot {
  const hermesActivity = ledger.activities.filter((activity) => activity.type === 'hermes_decision');
  const fundingPending = ledger.portfolio.totalDeposited > 0 && ledger.allocation.capitalDeployed === 0;
  const visibleActivity = hermesActivity.length ? hermesActivity : ledger.activities;
  const portfolioValue = poolProjection?.position.equity ?? ledger.portfolio.value;
  const availableToWithdraw = poolProjection?.withdrawable ?? ledger.portfolio.availableToWithdraw;
  const netProfit = roundCurrency(portfolioValue + ledger.portfolio.totalWithdrawn - ledger.portfolio.totalDeposited);
  const sinceInception = ledger.portfolio.totalDeposited
    ? roundPercent((netProfit / ledger.portfolio.totalDeposited) * 100)
    : 0;

  return {
    ...baseSnapshot,
    account: {
      ...baseSnapshot.account,
      label: ledger.account.label,
      lifecycle: ledger.account.status === 'ACTIVE' ? 'ACTIVE' : 'AWAITING_DEPOSIT',
    },
    updatedAt: ledger.generatedAt,
    portfolio: {
      value: portfolioValue,
      deposited: ledger.portfolio.totalDeposited,
      profit: netProfit,
      todaysChange: {
        amount: ledger.performance.todaysChange.amount,
        percentage: ledger.performance.todaysChange.percentage,
      },
      sinceInception,
      availableToWithdraw,
      allocatedCapital: poolProjection?.allocatedCapital,
      availableBalance: poolProjection?.availableBalance ?? availableToWithdraw,
      cashBalance: poolProjection?.cashBalance,
      fees: poolProjection?.fees ?? ledger.portfolio.accruedSolaceFees,
      funding: poolProjection?.funding,
      openPnlIncluded: poolProjection?.openPnlIncluded ?? false,
      pool: poolProjection
        ? {
            accountingVersion: poolProjection.position.accountingVersion,
            equity: poolProjection.position.equity,
            lastUpdated: poolProjection.position.updatedAt,
            navPerUnit: poolProjection.position.navPerUnit,
            poolId: poolProjection.pool.id,
            poolName: poolProjection.pool.name,
            poolShare: poolProjection.position.poolShare,
            units: poolProjection.position.units,
          }
        : undefined,
      realizedPnl: poolProjection?.latestNav.realizedPnl,
      reservedMargin: poolProjection?.reservedMargin,
      unrealizedPnl: poolProjection?.unrealizedPnl,
      withdrawable: poolProjection?.withdrawable ?? availableToWithdraw,
    },
    status: {
      ...baseSnapshot.status,
      status: fundingPending ? 'WAIT' : baseSnapshot.status.status,
      riskProfile,
      conviction: fundingPending ? 'LOW' : baseSnapshot.status.conviction,
      deployedCapital: ledger.allocation.capitalDeployed,
    },
    outlook: fundingPending
      ? {
          environment: 'Moderate',
          stance: 'Allocation pending',
          note: 'Capital has been received. Solace is completing treasury allocation before Hermes begins deployment.',
        }
      : baseSnapshot.outlook,
    allocation: ledger.allocation.allocations,
    activity: visibleActivity.slice(0, 3).map((activity) => ({
      timestamp: activity.createdAt,
      summary: activity.message,
    })),
    commentary: fundingPending
      ? 'Deposit received. Solace is completing treasury allocation and Hermes will begin operating once activation is complete.'
      : baseSnapshot.commentary,
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

    const ledger = await getLedgerReadModel(accountId).catch((error) => {
      console.warn('[hermes-dashboard] Ledger read model unavailable for pending account.', {
        accountId,
        error: error instanceof Error ? error.message : error,
      });

      return null;
    });

    if (!ledger) {
      return {
        ...pendingSnapshot,
        account: {
          ...pendingSnapshot.account,
          label: getPendingAccountLabel(accountId),
        },
      };
    }

    if (ledger.account.status === 'ACTIVE') {
      const poolProjection = await getPoolAccountProjection(ledger.account.id);

      return getActiveSnapshotFromLedger(baseSnapshot, ledger, selectedRiskProfile, poolProjection);
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
  const poolProjection = await getPoolAccountProjection(ledger.account.id);

  return getActiveSnapshotFromLedger(baseSnapshot, ledger, selectedRiskProfile, poolProjection);
}
