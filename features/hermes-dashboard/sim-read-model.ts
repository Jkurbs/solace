import 'server-only';

import { getStoredHermesBriefSnapshot } from '@/features/hermes-brief-snapshot/store';
import { listTrackedOpenPaths } from '@/features/hermes-ledger/path-tracking';
import { getHermesOpenExposure } from '@/features/hermes-ledger/open-exposure';
import { getHermesPublicMarketRead } from '@/features/hermes-market/read';
import { getLatestPoolAllocationSnapshot } from '@/features/ledger/pool-allocations';
import { getHermesRealizedTradeEventsForSimulation } from '@/features/ledger/hermes-realized-trades';
import type { HermesRealizedTradeEvent } from '@/features/ledger/types';

import { dashboardFieldSources, hermesDashboardContractVersion } from './contract';
import type { GuestSimSession } from './sim-session';
import type { HermesDashboardSnapshot, RiskProfile } from './types';

const DEFAULT_POOL_ID = process.env.HERMES_POOL_ID ?? 'pool_balanced_v1';
/** Used only when live source equity is missing. Never a floor on a known book. */
const FALLBACK_REFERENCE_CAPITAL = 100_000;

const tradePnlFormatter = new Intl.NumberFormat('en-US', {
  currency: 'USD',
  signDisplay: 'always',
  style: 'currency',
});

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function roundPercent(value: number) {
  return Math.round(value * 100) / 100;
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function tradeClosePnl(event: HermesRealizedTradeEvent) {
  const reconstructed = roundCurrency(event.realizedPnl - Math.abs(event.fees) - Math.abs(event.funding));
  return Math.abs(reconstructed - event.netPnl) < 0.02 ? event.realizedPnl : event.netPnl;
}

/**
 * Map founder close dollars onto this guest's capital.
 * Live KuCoin cash equity is often a few hundred dollars while close P&L is
 * already sized like a ~$10k book. Flooring the book at $100k made $10k
 * guests see 10¢ on the dollar. Only scale down when the live book is larger
 * than the guest; never inflate by dividing into a tiny source-equity print.
 */
function scaleShare(userCapital: number, founderCapital: number) {
  if (!Number.isFinite(userCapital) || userCapital <= 0) {
    return 0;
  }

  const live = Number.isFinite(founderCapital) && founderCapital > 0 ? founderCapital : 0;
  const ref = Math.max(live, userCapital, 1);

  return userCapital / ref;
}

function mapEnvironment(label: string): HermesDashboardSnapshot['outlook']['environment'] {
  const text = label.toLowerCase();
  if (text.includes('hostile') || text.includes('noisy') || text.includes('weak')) return 'Weak';
  if (text.includes('clear') || text.includes('clean') || text.includes('strong')) return 'Strong';
  return 'Moderate';
}

function mapOperatingStatus(posture: string): HermesDashboardSnapshot['status']['status'] {
  const upper = posture.toUpperCase();
  if (upper === 'STANDING_DOWN' || upper === 'RISK_OFF' || upper === 'DEFENSIVE') {
    return 'WAIT';
  }
  return 'ACTIVE';
}

function mapConviction(posture: string, deployedPaths: number): HermesDashboardSnapshot['status']['conviction'] {
  if (deployedPaths >= 3 || posture.toUpperCase() === 'DEPLOYED') return 'HIGH';
  if (deployedPaths >= 1 || posture.toUpperCase() === 'SELECTIVE') return 'MEDIUM';
  return 'LOW';
}

/**
 * Live open-access simulation dashboard: equity and closed orders scale to the
 * guest's chosen capital, and only paths opened after they entered participate.
 */
export async function buildLiveOpenSimulationDashboardSnapshot(
  session: GuestSimSession,
): Promise<HermesDashboardSnapshot> {
  const poolId = DEFAULT_POOL_ID;
  const depositAmount = session.depositAmount;
  const riskProfile: RiskProfile = session.riskProfile;
  const startedAt = session.startedAt;
  const updatedAt = new Date().toISOString();

  const [market, brief, openExposure, openPaths, tradeEvents, allocationSnapshot] = await Promise.all([
    getHermesPublicMarketRead().catch(() => null),
    getStoredHermesBriefSnapshot().catch(() => null),
    getHermesOpenExposure().catch(() => null),
    listTrackedOpenPaths().catch(() => []),
    getHermesRealizedTradeEventsForSimulation({
      after: startedAt,
      limit: 40,
      poolId,
    }).catch(() => [] as HermesRealizedTradeEvent[]),
    getLatestPoolAllocationSnapshot(poolId).catch(() => null),
  ]);

  const founderCapital = openExposure?.grossEquity ?? 0;
  const share = scaleShare(depositAmount, founderCapital);
  const referenceCapital = founderCapital > 0 ? founderCapital : FALLBACK_REFERENCE_CAPITAL;

  const startedMs = new Date(startedAt).getTime();
  const participatingOpens = openPaths.filter((path) => {
    const openedMs = new Date(path.openedAt).getTime();
    return Number.isFinite(openedMs) && openedMs >= startedMs;
  });
  // Require a live mark to agree, so a stale tracking book cannot flash
  // "In Strategy" on and off between refreshes.
  const liveOpenCount = openExposure?.positions.length ?? 0;
  const inAPath = participatingOpens.length > 0 && (openExposure === null || liveOpenCount > 0);

  // Closed-order PnL: founder/KuCoin dollars scaled to this guest's capital.
  let realizedPnl = 0;
  const tradeActivity: HermesDashboardSnapshot['activity'] = [];

  for (const event of tradeEvents) {
    const founderPnl = tradeClosePnl(event);
    const userPnl = roundCurrency(founderPnl * share);
    realizedPnl = roundCurrency(realizedPnl + userPnl);
    tradeActivity.push({
      timestamp: event.closedAt,
      summary: `Closed ${event.side === 'LONG' ? 'long' : 'short'} · ${tradePnlFormatter.format(userPnl)}`,
    });
  }

  // Open PnL only when Hermes holds paths opened after this guest entered.
  // Pre-entry open exposure is never attributed.
  const founderUnrealized = openExposure?.unrealizedPnl ?? 0;
  const unrealizedPnl = inAPath ? roundCurrency(founderUnrealized * share) : 0;

  const profit = roundCurrency(realizedPnl + unrealizedPnl);
  const value = roundCurrency(depositAmount + profit);
  const sinceInception = depositAmount > 0 ? roundPercent((profit / depositAmount) * 100) : 0;

  const postureRaw = market?.posture ?? (brief ? titleCase(brief.posture) : 'Standing Down');
  const environmentLabel =
    market?.environment ?? brief?.market_regime.label ?? 'Awaiting data';
  const deployedPaths = market?.capital.deployed_paths ?? brief?.paths.deployed ?? 0;

  // Deployed % of *user* capital: only after-entry opens share founder allocation.
  const founderAllocated = allocationSnapshot
    ? allocationSnapshot.allocations
        .filter((item) => item.asset.toUpperCase() !== 'CASH')
        .reduce((sum, item) => sum + (item.marginUsd || item.exposureUsd || 0), 0)
    : 0;
  const founderGross = Math.max(openExposure?.grossEquity ?? referenceCapital, 1);
  const founderDeployedPct =
    founderAllocated > 0 ? roundPercent(Math.min(100, (founderAllocated / founderGross) * 100)) : 0;
  const deployedCapital = inAPath ? founderDeployedPct : 0;

  const allocatedCapital = roundCurrency((value * deployedCapital) / 100);
  const availableBalance = roundCurrency(Math.max(0, value - allocatedCapital));
  const operatingStatus = inAPath ? mapOperatingStatus(postureRaw) : 'WAIT';

  const activity: HermesDashboardSnapshot['activity'] = [
    ...tradeActivity,
    {
      timestamp: startedAt,
      summary: `Simulation capital posted · $${depositAmount.toLocaleString('en-US')}`,
    },
    {
      timestamp: startedAt,
      summary: `${riskProfile} risk profile selected`,
    },
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const stance = inAPath ? titleCase(postureRaw) : 'Waiting for next path';
  const note = inAPath
    ? market?.summary ??
      brief?.summary ??
      'Hermes is managing simulation capital on paths opened after you entered.'
    : 'Hermes will open the next path when conditions clear. That is expected. Capital stays yours.';

  // Never publish pool tickers in simulation. Pre-entry opens are not on this
  // guest's book — they stay in cash until Hermes opens a path after they entered.
  const allocation =
    inAPath && deployedCapital > 0
      ? deployedCapital >= 100
        ? [{ asset: 'In Strategy', percentage: 100 }]
        : [
            { asset: 'In Strategy', percentage: deployedCapital },
            { asset: 'Cash', percentage: roundPercent(100 - deployedCapital) },
          ]
      : [{ asset: 'Cash', percentage: 100 }];

  return {
    contractVersion: hermesDashboardContractVersion,
    generatedAt: updatedAt,
    updatedAt,
    fieldSources: dashboardFieldSources.map((source) => ({ ...source })),
    account: {
      label: 'Simulation account',
      lifecycle: 'ACTIVE',
      mode: 'SIMULATION',
      depositIntent: {
        amount: depositAmount,
        status: 'REVIEW_PENDING',
      },
      identityVerification: {
        provider: 'stripe_identity',
        status: 'VERIFIED',
      },
      review: {
        accountType: 'Individual',
        country: 'United States',
        identityConsent: true,
        intendedDepositRange:
          depositAmount >= 100_000 ? '$100k-$250k' : depositAmount >= 25_000 ? '$25k-$100k' : '$10k-$25k',
        legalNameProvided: true,
        profileConfirmed: true,
        region: 'Simulation',
        riskAcknowledged: true,
        sourceOfFunds: 'Employment income',
        status: 'SUBMITTED',
      },
    },
    portfolio: {
      value,
      deposited: depositAmount,
      profit,
      equityState: {
        code: 'LIVE_EQUITY',
        detail:
          'Simulation equity tracks Hermes decisions after you entered, scaled to your virtual capital. No real money moves.',
        label: 'Simulation equity',
        updatedAt: openExposure?.asOf ?? market?.as_of ?? updatedAt,
      },
      todaysChange: {
        // Day mark needs a real mark series; dash-honest until wired.
        amount: 0,
        percentage: 0,
      },
      sinceInception,
      availableToWithdraw: availableBalance,
      allocatedCapital,
      availableBalance,
      cashBalance: availableBalance,
      fees: 0,
      funding: 0,
      openPnlIncluded: inAPath,
      realizedPnl,
      reservedMargin: 0,
      unrealizedPnl,
      withdrawable: availableBalance,
    },
    status: {
      status: operatingStatus,
      riskProfile,
      conviction: mapConviction(postureRaw, inAPath ? participatingOpens.length || deployedPaths : 0),
      deployedCapital,
    },
    outlook: {
      environment: mapEnvironment(environmentLabel),
      stance,
      note,
    },
    allocation,
    activity: activity.slice(0, 8),
    commentary:
      market?.summary ??
      brief?.summary ??
      'This is simulation capital. Closed results below use your allocation size, not founder exchange notional. Paths open before you entered are not on your book.',
    illustrative: {
      // Money and activity are live-derived; narrative stance uses public Hermes reads.
      status: false,
      outlook: false,
      commentary: false,
    },
  };
}
