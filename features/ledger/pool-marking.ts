import 'server-only';

import { createSupabaseDataClient, isSupabaseDataClientConfigured } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/types';

import type {
  PoolMarkingPool,
  PoolMarkingRecords,
  PoolNavMarkInput,
  PoolNavSnapshot,
  StrategyPool,
  UserPoolPosition,
} from './types';

type PoolNavSnapshotRow = Database['public']['Tables']['pool_nav_snapshots']['Row'];
type StrategyPoolRow = Database['public']['Tables']['strategy_pools']['Row'];
type UserPoolPositionRow = Database['public']['Tables']['user_pool_positions']['Row'];

const emptyPoolMarkingRecords: PoolMarkingRecords = {
  available: false,
  generatedAt: new Date(0).toISOString(),
  pools: [],
};

const poolAccountingObjects = [
  'strategy_pools',
  'pool_nav_snapshots',
  'user_pool_positions',
  'post_pool_nav_mark',
];

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function roundUnits(value: number) {
  return Math.round(value * 1e10) / 1e10;
}

function normalizeAmount(value: number) {
  return roundCurrency(Number.isFinite(value) ? value : 0);
}

function normalizeUnits(value: number) {
  return roundUnits(Number.isFinite(value) ? value : 0);
}

function isMissingPoolAccountingObject(message: string) {
  return (
    poolAccountingObjects.some((object) => message.includes(object)) &&
    (message.includes('Could not find') || message.includes('does not exist') || message.includes('schema cache'))
  );
}

function fromStrategyPoolRow(row: StrategyPoolRow): StrategyPool {
  return {
    accountingVersion: row.accounting_version,
    createdAt: row.created_at,
    currency: row.currency,
    id: row.id,
    name: row.name,
    riskProfile: row.risk_profile,
    status: row.status,
    updatedAt: row.updated_at,
  };
}

function fromPoolNavSnapshotRow(row: PoolNavSnapshotRow): PoolNavSnapshot {
  return {
    accountingVersion: row.accounting_version,
    allocatedCapital: normalizeAmount(row.allocated_capital),
    cashBalance: normalizeAmount(row.cash_balance),
    createdAt: row.created_at,
    effectiveAt: row.effective_at,
    fees: normalizeAmount(row.fees),
    funding: normalizeAmount(row.funding),
    grossEquity: normalizeAmount(row.gross_equity),
    id: row.id,
    navPerUnit: normalizeUnits(row.nav_per_unit),
    poolId: row.pool_id,
    realizedPnl: normalizeAmount(row.realized_pnl),
    reservedMargin: normalizeAmount(row.reserved_margin),
    source: row.source,
    totalUnits: normalizeUnits(row.total_units),
    unrealizedPnl: normalizeAmount(row.unrealized_pnl),
  };
}

function fromUserPoolPositionRow(row: UserPoolPositionRow): UserPoolPosition {
  return {
    accountingVersion: row.accounting_version,
    accountId: row.ledger_account_id,
    availableUnits: normalizeUnits(row.available_units),
    equity: normalizeAmount(row.equity),
    navPerUnit: normalizeUnits(row.nav_per_unit),
    poolId: row.pool_id,
    poolShare: normalizeUnits(row.pool_share),
    units: normalizeUnits(row.units),
    updatedAt: row.updated_at,
  };
}

function getLatestNavForPool(poolId: string, navs: PoolNavSnapshot[]) {
  return navs
    .filter((nav) => nav.poolId === poolId)
    .sort((a, b) => new Date(b.effectiveAt).getTime() - new Date(a.effectiveAt).getTime())[0];
}

function buildPoolMarkingPool({
  navs,
  pool,
  positions,
}: {
  navs: PoolNavSnapshot[];
  pool: StrategyPool;
  positions: UserPoolPosition[];
}): PoolMarkingPool {
  const poolPositions = positions.filter((position) => position.poolId === pool.id);

  return {
    latestNav: getLatestNavForPool(pool.id, navs),
    pool,
    positionCount: poolPositions.length,
    totalPositionEquity: normalizeAmount(poolPositions.reduce((total, position) => total + position.equity, 0)),
    totalPositionUnits: normalizeUnits(poolPositions.reduce((total, position) => total + position.units, 0)),
  };
}

export async function listPoolMarkingRecords(): Promise<PoolMarkingRecords> {
  if (!isSupabaseDataClientConfigured()) {
    return emptyPoolMarkingRecords;
  }

  try {
    const supabase = await createSupabaseDataClient();
    const [poolsResult, navsResult, positionsResult] = await Promise.all([
      supabase.from('strategy_pools').select('*'),
      supabase.from('pool_nav_snapshots').select('*'),
      supabase.from('user_pool_positions').select('*'),
    ]);

    if (poolsResult.error || navsResult.error || positionsResult.error) {
      const message = poolsResult.error?.message ?? navsResult.error?.message ?? positionsResult.error?.message ?? '';

      if (!isMissingPoolAccountingObject(message)) {
        console.warn('[pool-marking] Pool marking records unavailable.', message);
      }

      return emptyPoolMarkingRecords;
    }

    const navs = navsResult.data.map(fromPoolNavSnapshotRow);
    const positions = positionsResult.data.map(fromUserPoolPositionRow);

    return {
      available: true,
      generatedAt: new Date().toISOString(),
      pools: poolsResult.data
        .map(fromStrategyPoolRow)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((pool) => buildPoolMarkingPool({ navs, pool, positions })),
    };
  } catch (error) {
    console.warn('[pool-marking] Pool marking records read failed.', error);
    return emptyPoolMarkingRecords;
  }
}

export async function postPoolNavMark(input: PoolNavMarkInput) {
  if (!isSupabaseDataClientConfigured()) {
    return false;
  }

  try {
    const supabase = await createSupabaseDataClient();
    const { error } = await supabase.rpc('post_pool_nav_mark', {
      p_allocated_capital: normalizeAmount(input.allocatedCapital),
      p_cash_balance: normalizeAmount(input.cashBalance),
      p_effective_at: input.effectiveAt ?? new Date().toISOString(),
      p_fees: normalizeAmount(input.fees),
      p_funding: normalizeAmount(input.funding),
      p_gross_equity: normalizeAmount(input.grossEquity),
      p_pool_id: input.poolId,
      p_realized_pnl: normalizeAmount(input.realizedPnl),
      p_reserved_margin: normalizeAmount(input.reservedMargin),
      p_unrealized_pnl: normalizeAmount(input.unrealizedPnl),
    });

    if (error) {
      if (isMissingPoolAccountingObject(error.message)) {
        console.warn('[pool-marking] Pool NAV marking is not installed yet.', error.message);
        return false;
      }

      console.warn('[pool-marking] Pool NAV mark failed.', error.message);
      return false;
    }

    return true;
  } catch (error) {
    console.warn('[pool-marking] Pool NAV mark failed.', error);
    return false;
  }
}
