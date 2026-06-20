import 'server-only';

import { randomUUID } from 'crypto';

import { createSupabaseDataClient, isSupabaseDataClientConfigured } from '@/lib/supabase/server';
import type { Database, Json } from '@/lib/supabase/types';

import type {
  PoolAllocationBasis,
  PoolAllocationItem,
  PoolAllocationMarkInput,
  PoolAllocationSnapshot,
  PoolAllocationSide,
} from './types';

type PoolAllocationSnapshotRow = Database['public']['Tables']['pool_allocation_snapshots']['Row'];

const poolAllocationObjects = ['pool_allocation_snapshots'];
const allocationBasisValues = new Set<PoolAllocationBasis>(['capital', 'exposure']);
const allocationSideValues = new Set<PoolAllocationSide>(['LONG', 'SHORT', 'CASH']);

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function roundPercent(value: number) {
  return Math.round(value * 100) / 100;
}

function normalizeAmount(value: number) {
  return roundCurrency(Number.isFinite(value) ? value : 0);
}

function normalizePercent(value: number) {
  return roundPercent(Number.isFinite(value) ? value : 0);
}

function isMissingPoolAllocationObject(message: string) {
  return (
    poolAllocationObjects.some((object) => message.includes(object)) &&
    (message.includes('Could not find') || message.includes('does not exist') || message.includes('schema cache'))
  );
}

function toAllocationJson(allocations: PoolAllocationItem[]): Json {
  return allocations.map((allocation) => ({
    allocationBasis: allocation.allocationBasis,
    asset: allocation.asset,
    exposureUsd: normalizeAmount(allocation.exposureUsd),
    marginUsd: normalizeAmount(allocation.marginUsd),
    percentage: normalizePercent(allocation.percentage),
    ...(allocation.side ? { side: allocation.side } : {}),
  })) as Json;
}

function parseAllocationItem(value: unknown, fallbackBasis: PoolAllocationBasis): PoolAllocationItem | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const asset = typeof candidate.asset === 'string' ? candidate.asset.trim() : '';
  const percentage = Number(candidate.percentage);
  const exposureUsd = Number(candidate.exposureUsd);
  const marginUsd = Number(candidate.marginUsd);
  const allocationBasis =
    typeof candidate.allocationBasis === 'string' && allocationBasisValues.has(candidate.allocationBasis as PoolAllocationBasis)
      ? (candidate.allocationBasis as PoolAllocationBasis)
      : fallbackBasis;
  const side =
    typeof candidate.side === 'string' && allocationSideValues.has(candidate.side as PoolAllocationSide)
      ? (candidate.side as PoolAllocationSide)
      : undefined;

  if (!asset || !Number.isFinite(percentage) || !Number.isFinite(exposureUsd) || !Number.isFinite(marginUsd)) {
    return null;
  }

  return {
    allocationBasis,
    asset,
    exposureUsd: normalizeAmount(Math.max(0, exposureUsd)),
    marginUsd: normalizeAmount(Math.max(0, marginUsd)),
    percentage: normalizePercent(Math.max(0, percentage)),
    side,
  };
}

function parseAllocations(value: Json, fallbackBasis: PoolAllocationBasis) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.reduce<PoolAllocationItem[]>((items, item) => {
    const parsed = parseAllocationItem(item, fallbackBasis);

    if (parsed) {
      items.push(parsed);
    }

    return items;
  }, []);
}

function fromPoolAllocationSnapshotRow(row: PoolAllocationSnapshotRow): PoolAllocationSnapshot {
  return {
    allocationBasis: row.allocation_basis,
    allocations: parseAllocations(row.allocations, row.allocation_basis),
    cashBalance: normalizeAmount(row.cash_balance),
    createdAt: row.created_at,
    effectiveAt: row.effective_at,
    id: row.id,
    poolId: row.pool_id,
    source: row.source,
    totalExposure: normalizeAmount(row.total_exposure),
    totalMargin: normalizeAmount(row.total_margin),
  };
}

function normalizeAllocations(allocations: PoolAllocationItem[], allocationBasis: PoolAllocationBasis) {
  return allocations
    .map((allocation) => ({
      allocationBasis: allocation.allocationBasis ?? allocationBasis,
      asset: allocation.asset.trim(),
      exposureUsd: normalizeAmount(Math.max(0, allocation.exposureUsd)),
      marginUsd: normalizeAmount(Math.max(0, allocation.marginUsd)),
      percentage: normalizePercent(Math.max(0, allocation.percentage)),
      side: allocation.side,
    }))
    .filter((allocation) => allocation.asset && allocation.percentage > 0);
}

export async function getLatestPoolAllocationSnapshot(poolId: string): Promise<PoolAllocationSnapshot | null> {
  if (!isSupabaseDataClientConfigured()) {
    return null;
  }

  try {
    const supabase = await createSupabaseDataClient();
    const { data, error } = await supabase
      .from('pool_allocation_snapshots')
      .select('*')
      .eq('pool_id', poolId)
      .order('effective_at', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      if (isMissingPoolAllocationObject(error.message)) {
        return null;
      }

      console.warn('[pool-allocations] Latest allocation lookup failed.', error.message);
      return null;
    }

    return data[0] ? fromPoolAllocationSnapshotRow(data[0]) : null;
  } catch (error) {
    console.warn('[pool-allocations] Latest allocation lookup failed.', error);
    return null;
  }
}

export async function postPoolAllocationSnapshot(input: PoolAllocationMarkInput) {
  if (!isSupabaseDataClientConfigured()) {
    return false;
  }

  try {
    const supabase = await createSupabaseDataClient();
    const allocationBasis = input.allocationBasis ?? 'capital';
    const allocations = normalizeAllocations(input.allocations, allocationBasis);

    if (!allocations.length) {
      console.warn('[pool-allocations] Allocation snapshot rejected because it had no allocations.', input.poolId);
      return false;
    }

    const effectiveAt = input.effectiveAt ?? new Date().toISOString();
    const { error } = await supabase.from('pool_allocation_snapshots').insert({
      allocation_basis: allocationBasis,
      allocations: toAllocationJson(allocations),
      cash_balance: normalizeAmount(input.cashBalance),
      effective_at: effectiveAt,
      id: `alloc_mark_${input.poolId}_${randomUUID().replace(/-/g, '')}`,
      pool_id: input.poolId,
      source: 'hermes_bridge',
      total_exposure: normalizeAmount(input.totalExposure),
      total_margin: normalizeAmount(input.totalMargin),
    });

    if (error) {
      if (isMissingPoolAllocationObject(error.message)) {
        console.warn('[pool-allocations] Pool allocation snapshots table is not installed yet.', error.message);
        return false;
      }

      console.warn('[pool-allocations] Allocation snapshot post failed.', error.message);
      return false;
    }

    return true;
  } catch (error) {
    console.warn('[pool-allocations] Allocation snapshot post failed.', error);
    return false;
  }
}

