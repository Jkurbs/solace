import 'server-only';

import { createSupabaseDataClient, isSupabaseDataClientConfigured } from '@/lib/supabase/server';
import type { Database, Json } from '@/lib/supabase/types';

import type {
  PoolAccountProjection,
  PoolNavSnapshot,
  PoolUnitEvent,
  StrategyPool,
  UserPoolPosition,
} from './types';

type PoolNavSnapshotRow = Database['public']['Tables']['pool_nav_snapshots']['Row'];
type PoolUnitEventRow = Database['public']['Tables']['pool_unit_events']['Row'];
type StrategyPoolRow = Database['public']['Tables']['strategy_pools']['Row'];
type UserPoolPositionRow = Database['public']['Tables']['user_pool_positions']['Row'];

type PoolDepositMintInput = {
  accountId: string;
  amount: number;
  currency: 'USD';
  depositId: string;
  occurredAt: string;
  sourceReference?: string | null;
};

const poolAccountingObjects = [
  'strategy_pools',
  'pool_nav_snapshots',
  'pool_unit_events',
  'user_pool_positions',
  'pool_deposit_allocations',
  'post_pool_deposit_allocation',
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

function toMetadata(value: Json): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
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

function fromPoolUnitEventRow(row: PoolUnitEventRow): PoolUnitEvent {
  return {
    accountingVersion: row.accounting_version,
    accountId: row.ledger_account_id,
    amount: normalizeAmount(row.amount),
    createdAt: row.created_at,
    currency: row.currency,
    effectiveAt: row.effective_at,
    id: row.id,
    metadata: toMetadata(row.metadata),
    navPerUnit: normalizeUnits(row.nav_per_unit),
    poolId: row.pool_id,
    source: row.source,
    sourceReference: row.source_reference ?? undefined,
    type: row.type,
    unitsDelta: normalizeUnits(row.units_delta),
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

function buildProjection({
  latestNav,
  pool,
  position,
}: {
  latestNav: PoolNavSnapshot;
  pool: StrategyPool;
  position: UserPoolPosition;
}): PoolAccountProjection {
  const currentPoolShare = latestNav.totalUnits ? normalizeUnits((position.units / latestNav.totalUnits) * 100) : 0;
  const currentPosition: UserPoolPosition = {
    ...position,
    equity: normalizeAmount(position.units * latestNav.navPerUnit),
    navPerUnit: latestNav.navPerUnit,
    poolShare: currentPoolShare,
    updatedAt: latestNav.effectiveAt,
  };
  const shareRatio = currentPosition.poolShare / 100;
  const availableUnits = Math.min(position.units, Math.max(0, position.availableUnits));
  const accountCashBalance = normalizeAmount(latestNav.cashBalance * shareRatio);
  const unitAvailabilityCap = normalizeAmount(availableUnits * latestNav.navPerUnit);
  const withdrawable = normalizeAmount(Math.max(0, Math.min(accountCashBalance, unitAvailabilityCap, currentPosition.equity)));

  return {
    allocatedCapital: normalizeAmount(latestNav.allocatedCapital * shareRatio),
    availableBalance: accountCashBalance,
    cashBalance: accountCashBalance,
    fees: normalizeAmount(latestNav.fees * shareRatio),
    funding: normalizeAmount(latestNav.funding * shareRatio),
    latestNav,
    openPnlIncluded: true,
    pool,
    position: currentPosition,
    reservedMargin: normalizeAmount(latestNav.reservedMargin * shareRatio),
    unrealizedPnl: normalizeAmount(latestNav.unrealizedPnl * shareRatio),
    withdrawable,
  };
}

function buildPositionFromEvents({
  accountId,
  events,
  latestNav,
}: {
  accountId: string;
  events: PoolUnitEvent[];
  latestNav: PoolNavSnapshot;
}): UserPoolPosition {
  const units = normalizeUnits(events.reduce((total, event) => total + event.unitsDelta, 0));
  const poolShare = latestNav.totalUnits ? normalizeUnits((units / latestNav.totalUnits) * 100) : 0;
  const equity = normalizeAmount(units * latestNav.navPerUnit);
  const updatedAt = events[0]?.createdAt ?? latestNav.createdAt;

  return {
    accountId,
    accountingVersion: latestNav.accountingVersion,
    availableUnits: units,
    equity,
    navPerUnit: latestNav.navPerUnit,
    poolId: latestNav.poolId,
    poolShare,
    units,
    updatedAt,
  };
}

async function getLatestPoolNav(poolId: string): Promise<PoolNavSnapshot | null> {
  const supabase = await createSupabaseDataClient();
  const { data, error } = await supabase
    .from('pool_nav_snapshots')
    .select('*')
    .eq('pool_id', poolId)
    .order('effective_at', { ascending: false })
    .limit(1);

  if (error) {
    if (isMissingPoolAccountingObject(error.message)) {
      return null;
    }

    console.warn('[pool-units] Latest NAV lookup failed.', error.message);
    return null;
  }

  return data[0] ? fromPoolNavSnapshotRow(data[0]) : null;
}

async function getStrategyPool(poolId: string): Promise<StrategyPool | null> {
  const supabase = await createSupabaseDataClient();
  const { data, error } = await supabase.from('strategy_pools').select('*').eq('id', poolId).maybeSingle();

  if (error) {
    if (isMissingPoolAccountingObject(error.message)) {
      return null;
    }

    console.warn('[pool-units] Strategy pool lookup failed.', error.message);
    return null;
  }

  return data ? fromStrategyPoolRow(data) : null;
}

export async function getPoolAccountProjection(accountId: string): Promise<PoolAccountProjection | null> {
  if (!isSupabaseDataClientConfigured()) {
    return null;
  }

  try {
    const supabase = await createSupabaseDataClient();
    const { data: positionRows, error: positionError } = await supabase
      .from('user_pool_positions')
      .select('*')
      .eq('ledger_account_id', accountId)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (positionError) {
      if (isMissingPoolAccountingObject(positionError.message)) {
        return null;
      }

      console.warn('[pool-units] User pool position lookup failed.', positionError.message);
      return null;
    }

    const persistedPosition = positionRows[0] ? fromUserPoolPositionRow(positionRows[0]) : null;

    if (persistedPosition) {
      const [pool, latestNav] = await Promise.all([
        getStrategyPool(persistedPosition.poolId),
        getLatestPoolNav(persistedPosition.poolId),
      ]);

      if (!pool || !latestNav) {
        return null;
      }

      return buildProjection({ latestNav, pool, position: persistedPosition });
    }

    const { data: eventRows, error: eventsError } = await supabase
      .from('pool_unit_events')
      .select('*')
      .eq('ledger_account_id', accountId)
      .order('effective_at', { ascending: false });

    if (eventsError) {
      if (isMissingPoolAccountingObject(eventsError.message)) {
        return null;
      }

      console.warn('[pool-units] Pool unit event lookup failed.', eventsError.message);
      return null;
    }

    const events = eventRows.map(fromPoolUnitEventRow);

    if (!events.length) {
      return null;
    }

    const poolId = events[0].poolId;
    const poolEvents = events.filter((event) => event.poolId === poolId);
    const [pool, latestNav] = await Promise.all([getStrategyPool(poolId), getLatestPoolNav(poolId)]);

    if (!pool || !latestNav) {
      return null;
    }

    const position = buildPositionFromEvents({
      accountId,
      events: poolEvents,
      latestNav,
    });

    return buildProjection({ latestNav, pool, position });
  } catch (error) {
    console.warn('[pool-units] Pool account projection failed.', error);
    return null;
  }
}

export async function mintPoolUnitsForDeposit({
  accountId,
  amount,
  currency,
  depositId,
  occurredAt,
  sourceReference,
}: PoolDepositMintInput) {
  if (!isSupabaseDataClientConfigured()) {
    return false;
  }

  try {
    const supabase = await createSupabaseDataClient();
    const { error } = await supabase.rpc('post_pool_deposit_allocation', {
      p_amount: normalizeAmount(amount),
      p_currency: currency,
      p_deposit_id: depositId,
      p_effective_at: occurredAt,
      p_ledger_account_id: accountId,
      p_source_reference: sourceReference ?? null,
    });

    if (error) {
      if (isMissingPoolAccountingObject(error.message)) {
        console.warn('[pool-units] Pool unit accounting is not installed yet.', error.message);
        return true;
      }

      console.warn('[pool-units] Deposit unit mint failed.', error.message);
      return false;
    }

    return true;
  } catch (error) {
    console.warn('[pool-units] Deposit unit mint failed.', error);
    return false;
  }
}
