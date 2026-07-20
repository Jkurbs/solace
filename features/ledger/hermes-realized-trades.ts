import 'server-only';

import { randomUUID } from 'crypto';

import { createSupabaseDataClient, isSupabaseDataClientConfigured } from '@/lib/supabase/server';
import type { Database, Json } from '@/lib/supabase/types';

import type { HermesRealizedTradeEvent, HermesRealizedTradeEventInput } from './types';

type HermesRealizedTradeEventRow = Database['public']['Tables']['hermes_realized_trade_events']['Row'];

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function roundQuantity(value: number) {
  return Math.round(value * 1e10) / 1e10;
}

function normalizeAmount(value: number) {
  return roundCurrency(Number.isFinite(value) ? value : 0);
}

function normalizeQuantity(value: number | undefined) {
  const parsed = Number(value ?? 0);

  return roundQuantity(Number.isFinite(parsed) && parsed > 0 ? parsed : 0);
}

function normalizePrice(value: number | undefined) {
  if (value === undefined || value === null) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
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

function isMissingRealizedTradeObject(message: string) {
  return (
    message.includes('hermes_realized_trade_events') &&
    (message.includes('Could not find') || message.includes('does not exist') || message.includes('schema cache'))
  );
}

export function fromHermesRealizedTradeEventRow(row: HermesRealizedTradeEventRow): HermesRealizedTradeEvent {
  return {
    closedAt: row.closed_at,
    createdAt: row.created_at,
    entryPrice: row.entry_price === null ? undefined : normalizeAmount(row.entry_price),
    exitPrice: row.exit_price === null ? undefined : normalizeAmount(row.exit_price),
    fees: normalizeAmount(row.fees),
    funding: normalizeAmount(row.funding),
    id: row.id,
    netPnl: normalizeAmount(row.net_pnl),
    openedAt: row.opened_at ?? undefined,
    poolId: row.pool_id,
    quantity: roundQuantity(row.quantity),
    rawPayload: toRecord(row.raw_payload),
    realizedPnl: normalizeAmount(row.realized_pnl),
    side: row.side,
    sourceExchange: row.source_exchange,
    sourcePositionId: row.source_position_id ?? undefined,
    sourceTradeId: row.source_trade_id,
    symbol: row.symbol,
  };
}

export async function postHermesRealizedTradeEvent(input: HermesRealizedTradeEventInput) {
  if (!isSupabaseDataClientConfigured()) {
    return null;
  }

  const poolId = input.poolId.trim();
  const sourceExchange = (input.sourceExchange ?? 'kucoin_futures').trim() || 'kucoin_futures';
  const sourceTradeId = input.sourceTradeId.trim();
  const symbol = input.symbol.trim().toUpperCase();
  const closedAt = new Date(input.closedAt);

  if (!poolId || !sourceTradeId || !symbol || Number.isNaN(closedAt.getTime())) {
    return null;
  }

  const openedAt = input.openedAt ? new Date(input.openedAt) : null;

  if (openedAt && Number.isNaN(openedAt.getTime())) {
    return null;
  }

  const realizedPnl = normalizeAmount(input.realizedPnl);
  const fees = Math.max(0, normalizeAmount(input.fees ?? 0));
  // Funding may be income (negative cost). Do not clamp to ≥ 0.
  const funding = normalizeAmount(input.funding ?? 0);
  // KuCoin/Hermes realized is already net of fees+funding. Hermes also often
  // sends netPnl = realized - fees - abs(funding) (double-count). Detect and
  // keep exchange realized as the sealed close PnL.
  const explicitNet =
    input.netPnl !== undefined && input.netPnl !== null ? normalizeAmount(input.netPnl) : null;
  const reconstructed = normalizeAmount(realizedPnl - fees - Math.abs(funding));
  const netPnl =
    explicitNet === null
      ? realizedPnl
      : Math.abs(reconstructed - explicitNet) < 0.02
        ? realizedPnl
        : explicitNet;

  try {
    const supabase = await createSupabaseDataClient();
    const record = {
      closed_at: closedAt.toISOString(),
      entry_price: normalizePrice(input.entryPrice),
      exit_price: normalizePrice(input.exitPrice),
      fees,
      funding,
      id: `hermes_trade_${poolId}_${randomUUID().replace(/-/g, '')}`,
      net_pnl: netPnl,
      opened_at: openedAt?.toISOString() ?? null,
      pool_id: poolId,
      quantity: normalizeQuantity(input.quantity),
      raw_payload: toJson(input.rawPayload),
      realized_pnl: realizedPnl,
      side: input.side,
      source_exchange: sourceExchange,
      source_position_id: input.sourcePositionId?.trim() || null,
      source_trade_id: sourceTradeId,
      symbol,
    } satisfies Database['public']['Tables']['hermes_realized_trade_events']['Insert'];
    const { data, error } = await supabase
      .from('hermes_realized_trade_events')
      .insert(record)
      .select('*')
      .maybeSingle();

    if (error) {
      if (error.code === '23505') {
        const existing = await supabase
          .from('hermes_realized_trade_events')
          .select('*')
          .eq('pool_id', poolId)
          .eq('source_exchange', sourceExchange)
          .eq('source_trade_id', sourceTradeId)
          .maybeSingle();

        if (!existing.error && existing.data) {
          // Append-only table cannot rewrite a bad net_pnl. Return exchange
          // close when stored net double-counted fees already inside realized.
          const event = fromHermesRealizedTradeEventRow(existing.data);
          const reconstructed = normalizeAmount(
            event.realizedPnl - Math.abs(event.fees) - Math.abs(event.funding),
          );
          if (Math.abs(reconstructed - event.netPnl) < 0.02) {
            return { ...event, netPnl: event.realizedPnl };
          }
          return event;
        }
      }

      if (!isMissingRealizedTradeObject(error.message)) {
        console.warn('[hermes-realized-trades] Event insert failed.', error.message);
      }

      return null;
    }

    return data ? fromHermesRealizedTradeEventRow(data) : null;
  } catch (error) {
    console.warn('[hermes-realized-trades] Event insert failed.', error);
    return null;
  }
}

export async function getRecentHermesRealizedTradeEvents({
  limit = 5,
  poolId,
}: {
  limit?: number;
  poolId: string;
}): Promise<HermesRealizedTradeEvent[]> {
  if (!isSupabaseDataClientConfigured() || !poolId.trim()) {
    return [];
  }

  try {
    const supabase = await createSupabaseDataClient();
    const { data, error } = await supabase
      .from('hermes_realized_trade_events')
      .select('*')
      .eq('pool_id', poolId)
      .order('closed_at', { ascending: false })
      .limit(limit);

    if (error) {
      if (!isMissingRealizedTradeObject(error.message)) {
        console.warn('[hermes-realized-trades] Recent events lookup failed.', error.message);
      }

      return [];
    }

    return (data ?? []).map(fromHermesRealizedTradeEventRow);
  } catch (error) {
    console.warn('[hermes-realized-trades] Recent events lookup failed.', error);
    return [];
  }
}

export async function getHermesRealizedTradePerformance({
  after,
  at,
  poolId,
}: {
  after: string;
  at?: string;
  poolId: string;
}) {
  if (!isSupabaseDataClientConfigured() || !at || new Date(at).getTime() <= new Date(after).getTime()) {
    return {
      available: false,
      eventCount: 0,
      fees: 0,
      funding: 0,
      netPnl: 0,
      realizedPnl: 0,
    };
  }

  try {
    const supabase = await createSupabaseDataClient();
    const { data, error } = await supabase
      .from('hermes_realized_trade_events')
      .select('realized_pnl,fees,funding,net_pnl')
      .eq('pool_id', poolId)
      .gt('closed_at', after)
      .lte('closed_at', at);

    if (error) {
      if (!isMissingRealizedTradeObject(error.message)) {
        console.warn('[hermes-realized-trades] Performance lookup failed.', error.message);
      }

      return {
        available: false,
        eventCount: 0,
        fees: 0,
        funding: 0,
        netPnl: 0,
        realizedPnl: 0,
      };
    }

    return {
      available: true,
      eventCount: data.length,
      fees: normalizeAmount(data.reduce((total, event) => total + normalizeAmount(event.fees), 0)),
      funding: normalizeAmount(data.reduce((total, event) => total + normalizeAmount(event.funding), 0)),
      netPnl: normalizeAmount(data.reduce((total, event) => total + normalizeAmount(event.net_pnl), 0)),
      realizedPnl: normalizeAmount(data.reduce((total, event) => total + normalizeAmount(event.realized_pnl), 0)),
    };
  } catch (error) {
    console.warn('[hermes-realized-trades] Performance lookup failed.', error);
    return {
      available: false,
      eventCount: 0,
      fees: 0,
      funding: 0,
      netPnl: 0,
      realizedPnl: 0,
    };
  }
}
