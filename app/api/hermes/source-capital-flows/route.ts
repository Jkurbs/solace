import { NextResponse } from 'next/server';

import { recordHermesSourceCapitalFlow } from '@/features/ledger/pool-marking';
import type { HermesSourceCapitalFlowDirection } from '@/features/ledger/types';

const directions = new Set<HermesSourceCapitalFlowDirection>(['SOURCE_DEPOSIT', 'SOURCE_WITHDRAWAL']);

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

  return provided === expected;
}

function getNumber(value: unknown) {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;

  return Number.isFinite(parsed) ? parsed : null;
}

function getString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function parseSourceFlowPayload(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const payload = value as Record<string, unknown>;
  const poolId = getString(payload.poolId);
  const direction = getString(payload.direction).toUpperCase();
  const amount = getNumber(payload.amount);
  const effectiveAt = getString(payload.effectiveAt);
  const sourceExchange = getString(payload.sourceExchange);
  const sourceFlowId = getString(payload.sourceFlowId);
  const notes = getString(payload.notes);

  if (!poolId || !directions.has(direction as HermesSourceCapitalFlowDirection) || amount === null || amount <= 0) {
    return null;
  }

  if (effectiveAt && Number.isNaN(new Date(effectiveAt).getTime())) {
    return null;
  }

  return {
    amount,
    direction: direction as HermesSourceCapitalFlowDirection,
    effectiveAt: effectiveAt ? new Date(effectiveAt).toISOString() : undefined,
    notes: notes || undefined,
    poolId,
    sourceExchange: sourceExchange || undefined,
    sourceFlowId: sourceFlowId || undefined,
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
  const flows = payloads.map(parseSourceFlowPayload);

  if (!flows.length || flows.some((flow) => !flow)) {
    return NextResponse.json({ message: 'Invalid Hermes source capital flow payload.' }, { status: 400 });
  }

  const posted = [];

  for (const flow of flows) {
    const result = await recordHermesSourceCapitalFlow(flow!);

    if (!result) {
      return NextResponse.json({ message: 'Hermes source capital flow could not be posted.' }, { status: 503 });
    }

    posted.push(result);
  }

  return NextResponse.json({
    count: posted.length,
    flows: posted.map((flow) => ({
      amount: flow.amount,
      direction: flow.direction,
      id: flow.id,
      poolId: flow.poolId,
    })),
    message: posted.length === 1 ? 'Hermes source capital flow posted.' : 'Hermes source capital flows posted.',
  });
}
