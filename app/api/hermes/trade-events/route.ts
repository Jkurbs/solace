import { NextResponse } from 'next/server';

import { safeSecretEquals } from '@/lib/secret-compare';

import { getStoredHermesBriefSnapshot } from '@/features/hermes-brief-snapshot/store';
import { popOpenPathRef } from '@/features/hermes-ledger/path-tracking';
import { sealHermesLedgerRow } from '@/features/hermes-ledger/store';
import { postHermesRealizedTradeEvent } from '@/features/ledger/hermes-realized-trades';
import type { HermesRealizedTradeEvent, HermesRealizedTradeEventInput, HermesRealizedTradeSide } from '@/features/ledger/types';

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

// Per-row note: how long the path was held — actual information, unlike a
// repeated disclaimer. (PnL being net of fees/funding is stated once on the
// ledger page itself.)
function formatHoldDuration(openedAt: string | undefined, closedAt: string) {
  if (!openedAt) {
    return '';
  }

  const ms = new Date(closedAt).getTime() - new Date(openedAt).getTime();

  if (!Number.isFinite(ms) || ms <= 0) {
    return '';
  }

  const minutes = Math.round(ms / 60_000);

  if (minutes < 60) {
    return `Held ${minutes}m.`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 48) {
    return `Held ${hours}h ${minutes % 60}m.`;
  }

  return `Held ${Math.floor(hours / 24)}d ${hours % 24}h.`;
}

// A closed trade is a decision whose PnL is known the moment it is made, so
// the ledger row is sealed already-resolved. The record id derives from the
// exchange trade id, so re-posted events never create duplicate rows.
// Best-effort: ledger unavailability never blocks trade ingestion.
async function sealClosedTradeLedgerRow(event: HermesRealizedTradeEvent) {
  try {
    // Re-posted historical trades must not become backdated rows: the ledger
    // records from its opening forward. Only fresh closes get sealed.
    const closedAgoMs = Date.now() - new Date(event.closedAt).getTime();

    if (!Number.isFinite(closedAgoMs) || closedAgoMs > 48 * 60 * 60 * 1000) {
      return;
    }

    const snapshot = await getStoredHermesBriefSnapshot().catch(() => null);
    // Prefer exchange realized when Hermes net double-counted fees already
    // inside realized (realized - fees - funding ≈ net). Matches KuCoin close.
    const fees = Math.abs(Number(event.fees) || 0);
    const funding = Math.abs(Number(event.funding) || 0);
    const reconstructed = Math.round((event.realizedPnl - fees - funding) * 100) / 100;
    const closePnl =
      Math.abs(reconstructed - event.netPnl) < 0.02 ? event.realizedPnl : event.netPnl;
    const outcome = closePnl > 0 ? 'Advanced' : closePnl < 0 ? 'Gave back' : 'Flat';
    // Pair with the sealed open row when one exists. Null for paths opened
    // before the two-row schema: those closes are honestly unpaired.
    const ref = await popOpenPathRef(event.symbol, event.side);

    await sealHermesLedgerRow({
      decision: `Closed ${event.symbol} ${event.side.toLowerCase()} — path complete`,
      eventType: 'close',
      note: formatHoldDuration(event.openedAt, event.closedAt),
      outcome,
      pnl: closePnl,
      posture: snapshot && snapshot.brief_id !== 'fallback' ? snapshot.posture : 'DEPLOYED',
      recordId: `HMS-T-${event.sourceTradeId.slice(-8)}`,
      ref: ref ?? undefined,
      resolvedAt: event.closedAt,
      sealedAt: event.closedAt,
    });
  } catch (error) {
    console.warn('[trade-events] Closed trade could not be sealed to the ledger.', error);
  }
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
    await sealClosedTradeLedgerRow(result);
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
