import 'server-only';

import { getRecentHermesRealizedTradeEvents } from '@/features/ledger/hermes-realized-trades';
import { listMoneyMovementRecords } from '@/features/ledger/money-movement';
import { getRecentPoolAllocationSnapshots } from '@/features/ledger/pool-allocations';
import { getPoolAccountProjection } from '@/features/ledger/pool-units';
import { getLedgerReadModel } from '@/features/ledger/read-model';
import type {
  HermesRealizedTradeEvent,
  LedgerReadModel,
  PoolAllocationSnapshot,
  PoolAccountProjection,
  StripeDepositSettlement,
  TreasuryTask,
} from '@/features/ledger/types';

import { dashboardFieldSources, hermesDashboardContractVersion } from './contract';
import { hermesDashboardSnapshot } from './mock-data';
import type {
  AccountReview,
  HermesDashboardSnapshot,
  IdentityVerification,
  RiskProfile,
} from './types';

type DashboardSnapshotInput = {
  accountId?: string | null;
  accountReview?: AccountReview | null;
  depositIntentAmount?: number | null;
  identityVerification?: IdentityVerification | null;
  lifecycle?: HermesDashboardSnapshot['account']['lifecycle'];
  riskProfile?: RiskProfile | null;
};

type AccountMoneyState = {
  activeTreasuryTask: TreasuryTask | null;
  pendingSettlement: StripeDepositSettlement | null;
};

const blockingTreasuryTaskStatuses = new Set<TreasuryTask['status']>([
  'WAITING_SETTLEMENT',
  'QUEUED',
  'REVIEWING',
  'FUNDABLE',
  'APPROVED',
  'SUBMITTED',
]);

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
      equityState: { ...snapshot.portfolio.equityState },
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
      mode: 'SIMULATION',
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
      equityState: {
        code: 'NO_DEPOSIT',
        detail: 'Portfolio value will appear after capital is received and posted to the ledger.',
        label: 'Awaiting capital',
      },
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

function getAllocatedCapitalPercentage(portfolioValue: number, allocatedCapital: number | undefined, fallback: number) {
  if (portfolioValue <= 0 || allocatedCapital === undefined) {
    return fallback;
  }

  return roundPercent(Math.min(100, Math.max(0, (allocatedCapital / portfolioValue) * 100)));
}

function getPoolAllocation({
  allocatedCapital,
  portfolioValue,
}: {
  allocatedCapital: number | undefined;
  portfolioValue: number;
}) {
  const deployed = getAllocatedCapitalPercentage(portfolioValue, allocatedCapital, 0);
  const cash = roundPercent(Math.max(0, 100 - deployed));

  if (deployed <= 0) {
    return [{ asset: 'Cash', percentage: 100 }];
  }

  if (cash <= 0) {
    return [{ asset: 'In Strategy', percentage: 100 }];
  }

  return [
    { asset: 'In Strategy', percentage: deployed },
    { asset: 'Cash', percentage: cash },
  ];
}

function getHermesPoolAllocation(allocationSnapshot: PoolAllocationSnapshot | null) {
  if (!allocationSnapshot?.allocations.length) {
    return null;
  }

  return allocationSnapshot.allocations.map((allocation) => ({
    allocationBasis: allocation.allocationBasis,
    asset: allocation.asset,
    exposureUsd: allocation.exposureUsd,
    marginUsd: allocation.marginUsd,
    percentage: allocation.percentage,
    side: allocation.side,
  }));
}

function isAllocationFreshForProjection(
  allocationSnapshot: PoolAllocationSnapshot | null,
  poolProjection: PoolAccountProjection | null,
) {
  if (!allocationSnapshot) {
    return false;
  }

  if (!poolProjection) {
    return true;
  }

  const allocationTime = new Date(allocationSnapshot.effectiveAt).getTime();
  const navTime = new Date(poolProjection.latestNav.effectiveAt).getTime();

  if (!Number.isFinite(allocationTime) || !Number.isFinite(navTime)) {
    return false;
  }

  return allocationTime >= navTime - 60_000;
}

function getFreshHermesPoolAllocation(
  allocationSnapshot: PoolAllocationSnapshot | null,
  poolProjection: PoolAccountProjection | null,
) {
  if (!isAllocationFreshForProjection(allocationSnapshot, poolProjection)) {
    return null;
  }

  return getHermesPoolAllocation(allocationSnapshot);
}

function getAllocationActivityLabel(allocationSnapshot: PoolAllocationSnapshot) {
  const activeAllocations = allocationSnapshot.allocations
    .filter((allocation) => allocation.percentage > 0)
    .slice()
    .sort((first, second) => second.percentage - first.percentage);

  if (!activeAllocations.length) {
    return 'Hermes allocation updated';
  }

  const cashOnly = activeAllocations.length === 1 && activeAllocations[0]?.side === 'CASH';

  if (cashOnly) {
    return 'Hermes moved allocation to cash';
  }

  const allocationSummary = activeAllocations
    .slice(0, 3)
    .map((allocation) => {
      const side = allocation.side && allocation.side !== 'CASH' ? ` ${allocation.side.toLowerCase()}` : '';

      return `${allocation.asset}${side} ${roundPercent(allocation.percentage)}%`;
    })
    .join(', ');

  return `Hermes allocation updated: ${allocationSummary}`;
}

function getAllocationFingerprint(allocationSnapshot: PoolAllocationSnapshot) {
  return allocationSnapshot.allocations
    .filter((allocation) => allocation.percentage > 0)
    .map((allocation) => `${allocation.asset}:${allocation.side ?? 'NONE'}`)
    .sort()
    .join('|');
}

function getAllocationActivity(
  allocationSnapshots: PoolAllocationSnapshot[],
  poolProjection: PoolAccountProjection | null,
) {
  const seen = new Set<string>();

  return allocationSnapshots.reduce<Array<{ timestamp: string; summary: string }>>((items, snapshot) => {
    if (!isAllocationFreshForProjection(snapshot, poolProjection)) {
      return items;
    }

    const fingerprint = getAllocationFingerprint(snapshot);

    if (!fingerprint || seen.has(fingerprint)) {
      return items;
    }

    seen.add(fingerprint);
    items.push({
      timestamp: snapshot.effectiveAt,
      summary: getAllocationActivityLabel(snapshot),
    });

    return items;
  }, []);
}

const tradePnlFormatter = new Intl.NumberFormat('en-US', {
  currency: 'USD',
  signDisplay: 'always',
  style: 'currency',
});

// Real fills from the Hermes stream, rendered in the activity feed. This is a
// protected account surface, so per-trade detail is in-contract here.
function getTradeEventActivity(events: HermesRealizedTradeEvent[]) {
  return events.map((event) => ({
    timestamp: event.closedAt,
    summary: `Closed ${event.symbol} ${event.side === 'LONG' ? 'long' : 'short'} · ${tradePnlFormatter.format(event.netPnl)} net`,
  }));
}

async function getAccountMoneyState(accountId: string): Promise<AccountMoneyState> {
  const moneyMovement = await listMoneyMovementRecords().catch((error) => {
    console.warn('[hermes-dashboard] Money movement state unavailable.', {
      accountId,
      error: error instanceof Error ? error.message : error,
    });

    return null;
  });

  if (!moneyMovement?.available) {
    return {
      activeTreasuryTask: null,
      pendingSettlement: null,
    };
  }

  const accountSettlements = moneyMovement.stripeSettlements.filter((settlement) => settlement.accountId === accountId);
  const accountTasks = moneyMovement.treasuryTasks.filter((task) => task.accountId === accountId);

  return {
    activeTreasuryTask: accountTasks.find((task) => blockingTreasuryTaskStatuses.has(task.status)) ?? null,
    pendingSettlement: accountSettlements.find((settlement) => settlement.status === 'pending') ?? null,
  };
}

function getPortfolioEquityState({
  ledger,
  moneyState,
  poolProjection,
}: {
  ledger: LedgerReadModel;
  moneyState: AccountMoneyState;
  poolProjection: PoolAccountProjection | null;
}): HermesDashboardSnapshot['portfolio']['equityState'] {
  if (ledger.portfolio.totalDeposited <= 0) {
    return {
      code: 'NO_DEPOSIT',
      detail: 'No capital has posted to this Solace account yet.',
      label: 'Awaiting capital',
      updatedAt: ledger.generatedAt,
    };
  }

  if (ledger.account.accountMode === 'SIMULATION' && poolProjection) {
    return {
      code: 'LIVE_EQUITY',
      detail: 'Simulation portfolio value is calculated from your pool units and the latest Hermes NAV mark.',
      label: 'Live simulation',
      updatedAt: poolProjection.latestNav.effectiveAt,
    };
  }

  if (moneyState.pendingSettlement || moneyState.activeTreasuryTask?.status === 'WAITING_SETTLEMENT') {
    return {
      code: 'PENDING_SETTLEMENT',
      detail: 'The deposit is recorded. Stripe settlement availability is still being tracked before treasury funding.',
      label: 'Settlement pending',
      updatedAt: moneyState.pendingSettlement?.updatedAt ?? moneyState.activeTreasuryTask?.updatedAt ?? ledger.generatedAt,
    };
  }

  if (moneyState.activeTreasuryTask) {
    return {
      code: 'TREASURY_QUEUED',
      detail: 'Capital is posted and queued for Solace treasury allocation before Hermes deployment.',
      label: 'Treasury queued',
      updatedAt: moneyState.activeTreasuryTask.updatedAt,
    };
  }

  if (poolProjection) {
    return {
      code: 'LIVE_EQUITY',
      detail: 'Portfolio value is calculated from your pool units and the latest Hermes NAV mark.',
      label: 'Live equity',
      updatedAt: poolProjection.latestNav.effectiveAt,
    };
  }

  if (ledger.portfolio.totalDeposited > 0) {
    return {
      code: 'NAV_PENDING',
      detail: 'Capital is posted to the ledger. Pool units or a fresh NAV mark are not available yet.',
      label: 'NAV pending',
      updatedAt: ledger.generatedAt,
    };
  }

  return {
    code: 'LEDGER_ONLY',
    detail: 'Portfolio value is currently being shown from the ledger while pool projection is unavailable.',
    label: 'Ledger view',
    updatedAt: ledger.generatedAt,
  };
}

function getActiveSnapshotFromLedger(
  baseSnapshot: HermesDashboardSnapshot,
  ledger: LedgerReadModel,
  moneyState: AccountMoneyState,
  riskProfile: RiskProfile,
  poolAllocations: PoolAllocationSnapshot[],
  poolProjection: PoolAccountProjection | null,
  tradeEvents: HermesRealizedTradeEvent[] = [],
): HermesDashboardSnapshot {
  const hermesActivity = ledger.activities.filter((activity) => activity.type === 'hermes_decision');
  const allocationActivity = getAllocationActivity(poolAllocations, poolProjection);
  const visibleActivity = [
    ...getTradeEventActivity(tradeEvents),
    ...allocationActivity,
    ...(hermesActivity.length ? hermesActivity : ledger.activities).map((activity) => ({
      timestamp: activity.createdAt,
      summary: activity.message,
    })),
  ].sort((first, second) => new Date(second.timestamp).getTime() - new Date(first.timestamp).getTime());
  const portfolioValue = poolProjection?.position.equity ?? ledger.portfolio.value;
  const availableToWithdraw = poolProjection?.withdrawable ?? ledger.portfolio.availableToWithdraw;
  const netProfit = roundCurrency(portfolioValue + ledger.portfolio.totalWithdrawn - ledger.portfolio.totalDeposited);
  const sinceInception = ledger.portfolio.totalDeposited
    ? roundPercent((netProfit / ledger.portfolio.totalDeposited) * 100)
    : 0;
  const allocatedCapital = poolProjection?.allocatedCapital;
  const deployedCapital = getAllocatedCapitalPercentage(portfolioValue, allocatedCapital, ledger.allocation.capitalDeployed);
  const equityState = getPortfolioEquityState({ ledger, moneyState, poolProjection });
  const fundingPending =
    equityState.code === 'PENDING_SETTLEMENT' ||
    equityState.code === 'TREASURY_QUEUED' ||
    equityState.code === 'NAV_PENDING';
  const hermesAllocation = getFreshHermesPoolAllocation(poolAllocations[0] ?? null, poolProjection);
  const allocation = hermesAllocation
    ? hermesAllocation
    : poolProjection
      ? getPoolAllocation({
        allocatedCapital,
        portfolioValue,
      })
      : ledger.allocation.allocations;

  return {
    ...baseSnapshot,
    account: {
      ...baseSnapshot.account,
      label: ledger.account.label,
      lifecycle: ledger.account.status === 'ACTIVE' ? 'ACTIVE' : 'AWAITING_DEPOSIT',
      mode: ledger.account.accountMode,
    },
    updatedAt: ledger.generatedAt,
    portfolio: {
      value: portfolioValue,
      deposited: ledger.portfolio.totalDeposited,
      profit: netProfit,
      equityState,
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
      deployedCapital,
    },
    outlook: fundingPending
      ? {
          environment: 'Moderate',
          stance: equityState.label,
          note: equityState.detail,
        }
      : baseSnapshot.outlook,
    allocation,
    activity: visibleActivity.slice(0, 5),
    commentary: fundingPending
      ? equityState.detail
      : baseSnapshot.commentary,
    // When funding is pending, status/outlook/commentary are derived from the
    // real equity state; otherwise they still come from the placeholder base
    // snapshot until the owning Hermes services connect. Label them honestly.
    illustrative: {
      status: !fundingPending,
      outlook: !fundingPending,
      commentary: !fundingPending,
    },
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
      const [moneyState, poolProjection] = await Promise.all([
        getAccountMoneyState(ledger.account.id),
        getPoolAccountProjection(ledger.account.id),
      ]);
      const [poolAllocations, tradeEvents] = poolProjection
        ? await Promise.all([
            getRecentPoolAllocationSnapshots(poolProjection.pool.id, 8),
            getRecentHermesRealizedTradeEvents({ poolId: poolProjection.pool.id, limit: 5 }),
          ])
        : [[], []];

      return getActiveSnapshotFromLedger(
        baseSnapshot,
        ledger,
        moneyState,
        selectedRiskProfile,
        poolAllocations,
        poolProjection,
        tradeEvents,
      );
    }

    return {
      ...pendingSnapshot,
      account: {
        ...pendingSnapshot.account,
        label: ledger.account.label,
        mode: ledger.account.accountMode,
      },
      updatedAt: ledger.generatedAt,
    };
  }

  const ledger = await getLedgerReadModel(accountId ?? undefined);
  const [moneyState, poolProjection] = await Promise.all([
    getAccountMoneyState(ledger.account.id),
    getPoolAccountProjection(ledger.account.id),
  ]);
  const [poolAllocations, tradeEvents] = poolProjection
    ? await Promise.all([
        getRecentPoolAllocationSnapshots(poolProjection.pool.id, 8),
        getRecentHermesRealizedTradeEvents({ poolId: poolProjection.pool.id, limit: 5 }),
      ])
    : [[], []];

  return getActiveSnapshotFromLedger(
    baseSnapshot,
    ledger,
    moneyState,
    selectedRiskProfile,
    poolAllocations,
    poolProjection,
    tradeEvents,
  );
}
