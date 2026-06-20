import 'server-only';

import { randomUUID } from 'crypto';

import { createSupabaseDataClient, isSupabaseDataClientConfigured } from '@/lib/supabase/server';
import type { Database, Json } from '@/lib/supabase/types';

import type {
  HermesPoolSourceMark,
  HermesPoolSourceMarkInput,
  HermesSourceMarkStatus,
  HermesTranslatedPoolMarkResult,
  PoolMarkingPool,
  PoolMarkingRecords,
  PoolNavMarkInput,
  PoolNavSnapshot,
  StrategyPool,
  UserPoolPosition,
} from './types';

type HermesPoolSourceMarkRow = Database['public']['Tables']['hermes_pool_source_marks']['Row'];
type PoolNavSnapshotRow = Database['public']['Tables']['pool_nav_snapshots']['Row'];
type StrategyPoolRow = Database['public']['Tables']['strategy_pools']['Row'];
type UserPoolPositionRow = Database['public']['Tables']['user_pool_positions']['Row'];

const emptyPoolMarkingRecords: PoolMarkingRecords = {
  available: false,
  generatedAt: new Date(0).toISOString(),
  pools: [],
  sourceMarkingAvailable: false,
};

const poolAccountingObjects = [
  'hermes_pool_source_marks',
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

function normalizeRatio(value: number) {
  return Math.round((Number.isFinite(value) ? value : 0) * 1e10) / 1e10;
}

function getMaximumSourceReturnPerMark() {
  const configured = Number(process.env.HERMES_MAX_SOURCE_RETURN_PER_MARK);

  if (Number.isFinite(configured) && configured > 0) {
    return configured;
  }

  return 0.25;
}

function toJson(value: Record<string, unknown> | undefined): Json {
  if (!value) {
    return {};
  }

  return JSON.parse(JSON.stringify(value)) as Json;
}

function toRecord(value: Json): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
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

function fromHermesPoolSourceMarkRow(row: HermesPoolSourceMarkRow): HermesPoolSourceMark {
  return {
    appliedPoolEquity: row.applied_pool_equity === null ? undefined : normalizeAmount(row.applied_pool_equity),
    appliedPoolNavPerUnit: row.applied_pool_nav_per_unit === null ? undefined : normalizeUnits(row.applied_pool_nav_per_unit),
    createdAt: row.created_at,
    effectiveAt: row.effective_at,
    id: row.id,
    navSnapshotId: row.nav_snapshot_id ?? undefined,
    poolId: row.pool_id,
    rawPayload: toRecord(row.raw_payload),
    source: row.source,
    sourceAllocatedCapital: normalizeAmount(row.source_allocated_capital),
    sourceCashBalance: normalizeAmount(row.source_cash_balance),
    sourceEquity: normalizeAmount(row.source_equity),
    sourceExchange: row.source_exchange ?? undefined,
    sourceFees: normalizeAmount(row.source_fees),
    sourceFunding: normalizeAmount(row.source_funding),
    sourceRealizedPnl: normalizeAmount(row.source_realized_pnl),
    sourceReservedMargin: normalizeAmount(row.source_reserved_margin),
    sourceReturn: normalizeRatio(row.source_return),
    sourceUnrealizedPnl: normalizeAmount(row.source_unrealized_pnl),
    status: row.status,
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

function getLatestSourceMarkForPool(poolId: string, marks: HermesPoolSourceMark[]) {
  return marks
    .filter((mark) => mark.poolId === poolId)
    .sort((a, b) => new Date(b.effectiveAt).getTime() - new Date(a.effectiveAt).getTime())[0];
}

function buildPoolMarkingPool({
  hermesSourceMarks,
  navs,
  pool,
  positions,
}: {
  hermesSourceMarks: HermesPoolSourceMark[];
  navs: PoolNavSnapshot[];
  pool: StrategyPool;
  positions: UserPoolPosition[];
}): PoolMarkingPool {
  const poolPositions = positions.filter((position) => position.poolId === pool.id);

  return {
    latestHermesSourceMark: getLatestSourceMarkForPool(pool.id, hermesSourceMarks),
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
    const sourceMarksResult = await supabase.from('hermes_pool_source_marks').select('*');
    const sourceMarkingAvailable = !sourceMarksResult.error;
    const hermesSourceMarks =
      sourceMarksResult.error && isMissingPoolAccountingObject(sourceMarksResult.error.message)
        ? []
        : (sourceMarksResult.data ?? []).map(fromHermesPoolSourceMarkRow);

    if (sourceMarksResult.error && !isMissingPoolAccountingObject(sourceMarksResult.error.message)) {
      console.warn('[pool-marking] Hermes source marks unavailable.', sourceMarksResult.error.message);
    }

    return {
      available: true,
      generatedAt: new Date().toISOString(),
      pools: poolsResult.data
        .map(fromStrategyPoolRow)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((pool) => buildPoolMarkingPool({ hermesSourceMarks, navs, pool, positions })),
      sourceMarkingAvailable,
    };
  } catch (error) {
    console.warn('[pool-marking] Pool marking records read failed.', error);
    return emptyPoolMarkingRecords;
  }
}

type PoolNavMarkResult = {
  navPerUnit: number;
  navSnapshotId: string;
  poolId: string;
  totalUnits: number;
};

function fromPoolNavMarkRpcResult(row: {
  nav_per_unit: number;
  nav_snapshot_id: string;
  pool_id: string;
  total_units: number;
}): PoolNavMarkResult {
  return {
    navPerUnit: normalizeUnits(row.nav_per_unit),
    navSnapshotId: row.nav_snapshot_id,
    poolId: row.pool_id,
    totalUnits: normalizeUnits(row.total_units),
  };
}

async function postPoolNavMarkResult(input: PoolNavMarkInput): Promise<PoolNavMarkResult | null> {
  if (!isSupabaseDataClientConfigured()) {
    return null;
  }

  try {
    const supabase = await createSupabaseDataClient();
    const { data, error } = await supabase.rpc('post_pool_nav_mark', {
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
        return null;
      }

      console.warn('[pool-marking] Pool NAV mark failed.', error.message);
      return null;
    }

    return data?.[0] ? fromPoolNavMarkRpcResult(data[0]) : null;
  } catch (error) {
    console.warn('[pool-marking] Pool NAV mark failed.', error);
    return null;
  }
}

export async function postPoolNavMark(input: PoolNavMarkInput) {
  return Boolean(await postPoolNavMarkResult(input));
}

async function getLatestPoolNavSnapshot(poolId: string): Promise<PoolNavSnapshot | null> {
  const supabase = await createSupabaseDataClient();
  const { data, error } = await supabase
    .from('pool_nav_snapshots')
    .select('*')
    .eq('pool_id', poolId)
    .order('effective_at', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    if (!isMissingPoolAccountingObject(error.message)) {
      console.warn('[pool-marking] Latest pool NAV lookup failed.', error.message);
    }

    return null;
  }

  return data[0] ? fromPoolNavSnapshotRow(data[0]) : null;
}

async function getLatestHermesSourceMark(poolId: string): Promise<HermesPoolSourceMark | null> {
  const supabase = await createSupabaseDataClient();
  const { data, error } = await supabase
    .from('hermes_pool_source_marks')
    .select('*')
    .eq('pool_id', poolId)
    .order('effective_at', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    if (!isMissingPoolAccountingObject(error.message)) {
      console.warn('[pool-marking] Latest Hermes source mark lookup failed.', error.message);
    }

    return null;
  }

  return data[0] ? fromHermesPoolSourceMarkRow(data[0]) : null;
}

function scaleSourceDelta(sourceDelta: number, sourceEquity: number, poolEquity: number) {
  if (sourceEquity <= 0 || poolEquity <= 0) {
    return 0;
  }

  return normalizeAmount(sourceDelta * (poolEquity / sourceEquity));
}

function scaleSourceControlBalance(sourceAmount: number, sourceEquity: number, poolEquity: number) {
  if (sourceEquity <= 0 || poolEquity <= 0) {
    return 0;
  }

  return normalizeAmount(poolEquity * Math.max(0, sourceAmount / sourceEquity));
}

function buildTranslatedNavMark({
  input,
  latestNav,
  previousSourceMark,
  sourceReturn,
}: {
  input: HermesPoolSourceMarkInput;
  latestNav: PoolNavSnapshot;
  previousSourceMark: HermesPoolSourceMark;
  sourceReturn: number;
}): PoolNavMarkInput {
  const rawPoolEquity = latestNav.grossEquity * (1 + sourceReturn);
  const grossEquity = normalizeAmount(Math.max(latestNav.totalUnits > 0 ? 0.01 : 0, rawPoolEquity));
  const sourceScaleEquity = latestNav.grossEquity;
  const realizedPnlDelta = scaleSourceDelta(
    input.realizedPnl - previousSourceMark.sourceRealizedPnl,
    previousSourceMark.sourceEquity,
    sourceScaleEquity,
  );
  const unrealizedPnlDelta = scaleSourceDelta(
    input.unrealizedPnl - previousSourceMark.sourceUnrealizedPnl,
    previousSourceMark.sourceEquity,
    sourceScaleEquity,
  );
  const feesDelta = scaleSourceDelta(input.fees - previousSourceMark.sourceFees, previousSourceMark.sourceEquity, sourceScaleEquity);
  const fundingDelta = scaleSourceDelta(input.funding - previousSourceMark.sourceFunding, previousSourceMark.sourceEquity, sourceScaleEquity);

  return {
    allocatedCapital: scaleSourceControlBalance(input.allocatedCapital, input.grossEquity, grossEquity),
    cashBalance: scaleSourceControlBalance(input.cashBalance, input.grossEquity, grossEquity),
    effectiveAt: input.effectiveAt,
    fees: normalizeAmount(Math.max(0, latestNav.fees + feesDelta)),
    funding: normalizeAmount(Math.max(0, latestNav.funding + fundingDelta)),
    grossEquity,
    poolId: input.poolId,
    realizedPnl: normalizeAmount(latestNav.realizedPnl + realizedPnlDelta),
    reservedMargin: scaleSourceControlBalance(input.reservedMargin, input.grossEquity, grossEquity),
    unrealizedPnl: normalizeAmount(latestNav.unrealizedPnl + unrealizedPnlDelta),
  };
}

async function insertHermesSourceMark({
  input,
  navMark,
  navResult,
  sourceReturn,
  status,
}: {
  input: HermesPoolSourceMarkInput;
  navMark?: PoolNavMarkInput;
  navResult?: PoolNavMarkResult | null;
  sourceReturn: number;
  status: HermesSourceMarkStatus;
}) {
  const supabase = await createSupabaseDataClient();
  const effectiveAt = input.effectiveAt ?? new Date().toISOString();
  const { data, error } = await supabase
    .from('hermes_pool_source_marks')
    .insert({
      applied_pool_equity: navMark?.grossEquity ?? null,
      applied_pool_nav_per_unit: navResult?.navPerUnit ?? null,
      effective_at: effectiveAt,
      id: `hermes_source_${input.poolId}_${randomUUID().replace(/-/g, '')}`,
      nav_snapshot_id: navResult?.navSnapshotId ?? null,
      pool_id: input.poolId,
      raw_payload: toJson(input.rawPayload),
      source: 'hermes_bridge',
      source_allocated_capital: normalizeAmount(input.allocatedCapital),
      source_cash_balance: normalizeAmount(input.cashBalance),
      source_equity: normalizeAmount(input.grossEquity),
      source_exchange: input.sourceExchange ?? null,
      source_fees: normalizeAmount(input.fees),
      source_funding: normalizeAmount(input.funding),
      source_realized_pnl: normalizeAmount(input.realizedPnl),
      source_reserved_margin: normalizeAmount(input.reservedMargin),
      source_return: normalizeRatio(sourceReturn),
      source_unrealized_pnl: normalizeAmount(input.unrealizedPnl),
      status,
    })
    .select('*')
    .single();

  if (error) {
    if (isMissingPoolAccountingObject(error.message)) {
      console.warn('[pool-marking] Hermes source marks table is not installed yet.', error.message);
      return null;
    }

    console.warn('[pool-marking] Hermes source mark insert failed.', error.message);
    return null;
  }

  return fromHermesPoolSourceMarkRow(data);
}

export async function postTranslatedHermesPoolMark(
  input: HermesPoolSourceMarkInput,
): Promise<HermesTranslatedPoolMarkResult | null> {
  if (!isSupabaseDataClientConfigured()) {
    return null;
  }

  try {
    const [previousSourceMark, latestNav] = await Promise.all([
      getLatestHermesSourceMark(input.poolId),
      getLatestPoolNavSnapshot(input.poolId),
    ]);

    if (!previousSourceMark || previousSourceMark.sourceEquity <= 0) {
      const sourceMark = await insertHermesSourceMark({
        input,
        sourceReturn: 0,
        status: 'baseline',
      });

      return sourceMark ? { sourceMark, status: 'baseline' } : null;
    }

    if (!latestNav || latestNav.totalUnits <= 0) {
      const sourceReturn = normalizeRatio((input.grossEquity - previousSourceMark.sourceEquity) / previousSourceMark.sourceEquity);
      const sourceMark = await insertHermesSourceMark({
        input,
        sourceReturn,
        status: 'stored',
      });

      return sourceMark ? { sourceMark, status: 'stored' } : null;
    }

    if (new Date(previousSourceMark.effectiveAt).getTime() < new Date(latestNav.effectiveAt).getTime()) {
      const sourceMark = await insertHermesSourceMark({
        input,
        sourceReturn: 0,
        status: 'baseline',
      });

      return sourceMark ? { sourceMark, status: 'baseline' } : null;
    }

    const sourceReturn = normalizeRatio((input.grossEquity - previousSourceMark.sourceEquity) / previousSourceMark.sourceEquity);
    const maximumSourceReturn = getMaximumSourceReturnPerMark();

    if (Math.abs(sourceReturn) > maximumSourceReturn) {
      const sourceMark = await insertHermesSourceMark({
        input,
        sourceReturn,
        status: 'stored',
      });

      return sourceMark ? { sourceMark, status: 'stored' } : null;
    }

    const navMark = buildTranslatedNavMark({
      input,
      latestNav,
      previousSourceMark,
      sourceReturn,
    });
    const navResult = await postPoolNavMarkResult(navMark);

    if (!navResult) {
      return null;
    }

    const sourceMark = await insertHermesSourceMark({
      input,
      navMark,
      navResult,
      sourceReturn,
      status: 'applied',
    });

    return sourceMark
      ? {
          navMark,
          navSnapshotId: navResult.navSnapshotId,
          sourceMark,
          status: 'applied',
        }
      : null;
  } catch (error) {
    console.warn('[pool-marking] Translated Hermes mark failed.', error);
    return null;
  }
}
