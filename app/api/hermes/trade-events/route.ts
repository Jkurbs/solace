import { NextResponse } from 'next/server';

import { safeSecretEquals } from '@/lib/secret-compare';

import { postHermesRealizedTradeEvent } from '@/features/ledger/hermes-realized-trades';
import type { HermesRealizedTradeEventInput, HermesRealizedTradeSide } from '@/features/ledger/types';

const sides = new Set<HermesRealizedTradeSide>(['LONG', 'SHORT']);

function getBearerToken(request: Request) {
  const authorization = request.headers.get('authorization') ?? '';

  if (!authorization.toLowerCase().startsWith('bearer ')) {
    return null;
  }

  return authorization.slice('bearer '.length).trim();
}

function hasHermesIngestAccess(request: Request) {
  const expected = process.env.HERMES_INGEST_SECRET;

  if (!expected) {
    return false;
  }

  const provided = request.headers.get('x-hermes-ingest-secret') ?? getBearerToken(request);

  return typeof provided === 'string' && provided.length > 0 ? safeSecretEquals(provided, expected) : false;
}

function getNumber(value: unknown) {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;

  return Number.isFinite(parsed) ? parsed : null;
}

function getString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function parseTradeEventPayload(value: unknown): HermesRealizedTradeEventInput | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const payload = value as Record<string, unknown>;
  const poolId = getString(payload.poolId);
  const sourceTradeId = getString(payload.sourceTradeId);
  const symbol = getString(payload.symbol);
  const side = getString(payload.side).toUpperCase();
  const closedAt = getString(payload.closedAt);
  const realizedPnl = getNumber(payload.realizedPnl);
  const fees = getNumber(payload.fees);
  const funding = getNumber(payload.funding);
  const netPnl = getNumber(payload.netPnl);
  const quantity = getNumber(payload.quantity);
  const entryPrice = getNumber(payload.entryPrice);
  const exitPrice = getNumber(payload.exitPrice);
  const openedAt = getString(payload.openedAt);

  if (!poolId || !sourceTradeId || !symbol || !closedAt || !sides.has(side as HermesRealizedTradeSide) || realizedPnl === null) {
    return null;
  }

  const closedAtDate = new Date(closedAt);

  if (Number.isNaN(closedAtDate.getTime())) {
    return null;
  }

  if (openedAt && Number.isNaN(new Date(openedAt).getTime())) {
    return null;
  }

  return {
    closedAt: closedAtDate.toISOString(),
    entryPrice: entryPrice ?? undefined,
    exitPrice: exitPrice ?? undefined,
    fees: fees ?? undefined,
    funding: funding ?? undefined,
    netPnl: netPnl ?? undefined,
    openedAt: openedAt ? new Date(openedAt).toISOString() : undefined,
    poolId,
    quantity: quantity ?? undefined,
    rawPayload: payload,
    realizedPnl,
    side: side as HermesRealizedTradeSide,
    sourceExchange: getString(payload.sourceExchange) || undefined,
    sourcePositionId: getString(payload.sourcePositionId) || undefined,
    sourceTradeId,
    symbol,
  };
}

export async function POST(request: Request) {
  if (!process.env.HERMES_INGEST_SECRET) {
    return NextResponse.json({ message: 'Hermes ingest is not configured.' }, { status: 503 });
  }

  if (!hasHermesIngestAccess(request)) {
    return NextResponse.json({ message: 'Hermes ingest access required.' }, { status: 401 });
  }

  const rawPayload = await request.json().catch(() => null);
  const payloads = Array.isArray(rawPayload) ? rawPayload : [rawPayload];
  const events = payloads.map(parseTradeEventPayload);

  if (!events.length || events.some((event) => !event)) {
    return NextResponse.json({ message: 'Invalid Hermes realized trade event payload.' }, { status: 400 });
  }

  const posted = [];

  for (const event of events) {
    const result = await postHermesRealizedTradeEvent(event as HermesRealizedTradeEventInput);

    if (!result) {
      return NextResponse.json({ message: 'Hermes realized trade event could not be posted.' }, { status: 503 });
    }

    posted.push(result);
  }

  return NextResponse.json({
    count: posted.length,
    events: posted.map((event) => ({
      id: event.id,
      netPnl: event.netPnl,
      poolId: event.poolId,
      sourceTradeId: event.sourceTradeId,
      symbol: event.symbol,
    })),
    message: posted.length === 1 ? 'Hermes realized trade event posted.' : 'Hermes realized trade events posted.',
  });
}
