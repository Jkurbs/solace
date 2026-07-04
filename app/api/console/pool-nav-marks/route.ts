import { NextResponse } from 'next/server';

import { listPoolMarkingRecords, postPoolNavMark } from '@/features/ledger/pool-marking';
import { getRuntimeSnapshot, saveRuntimeSnapshot } from '@/features/runtime-snapshots/store';
import { hasConsoleAccess } from '@/features/solace-console/access';
import type { Json } from '@/lib/supabase/types';

// A manual NAV mark reprices every position in the pool instantly, so the
// operator path gets the guardrails the Hermes-derived path already has:
// sign checks, a large-change confirmation gate, double-submit dedupe, and
// an operator activity record.
const LARGE_CHANGE_RATIO = 0.25;

const recentRequestIds = new Map<string, number>();
const REQUEST_ID_TTL_MS = 10 * 60_000;

function isDuplicateRequest(clientRequestId: string) {
  const now = Date.now();

  for (const [id, seenAt] of recentRequestIds) {
    if (now - seenAt > REQUEST_ID_TTL_MS) {
      recentRequestIds.delete(id);
    }
  }

  if (!clientRequestId) {
    return false;
  }

  if (recentRequestIds.has(clientRequestId)) {
    return true;
  }

  recentRequestIds.set(clientRequestId, now);
  return false;
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === 'string' ? value.trim() : '';
}

function getNumber(formData: FormData, key: string) {
  const value = getString(formData, key);
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function wantsJson(request: Request) {
  return request.headers.get('accept')?.includes('application/json') ?? false;
}

function parseOptionalIsoDate(value: string) {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function respondToPoolMark(
  request: Request,
  redirectUrl: URL,
  status: 'confirm-required' | 'failed' | 'invalid' | 'posted',
  message?: string,
) {
  if (wantsJson(request)) {
    return NextResponse.json(
      {
        message:
          message ??
          (status === 'posted'
            ? 'Pool NAV mark posted.'
            : status === 'invalid'
              ? 'Pool NAV mark was invalid.'
              : status === 'confirm-required'
                ? 'Pool NAV mark needs large-change confirmation.'
                : 'Pool NAV mark could not be posted.'),
        status,
      },
      { status: status === 'posted' ? 200 : 400 },
    );
  }

  redirectUrl.searchParams.set('pool', status);
  return NextResponse.redirect(redirectUrl, 303);
}

// Operator action journal: an append-capped log in the durable runtime
// snapshot store, so "what did I change last Tuesday" is answerable.
async function recordOperatorNavActivity(poolId: string, previousEquity: number | null, grossEquity: number) {
  try {
    const stored = await getRuntimeSnapshot('operator_actions');
    const existing = Array.isArray(stored) ? stored : [];
    const entry = {
      action: 'nav_override',
      at: new Date().toISOString(),
      from: previousEquity,
      poolId,
      to: grossEquity,
    };

    await saveRuntimeSnapshot('operator_actions', [entry, ...existing].slice(0, 200) as unknown as Json);
  } catch (error) {
    console.warn('[pool-nav-marks] Operator action could not be journaled.', error);
  }
}

export async function POST(request: Request) {
  if (!(await hasConsoleAccess())) {
    return NextResponse.json({ message: 'Console access required.' }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  const redirectUrl = new URL('/console', request.url);

  if (!formData) {
    return respondToPoolMark(request, redirectUrl, 'invalid');
  }

  const poolId = getString(formData, 'poolId');
  const grossEquity = getNumber(formData, 'grossEquity');
  const cashBalance = getNumber(formData, 'cashBalance');
  const allocatedCapital = getNumber(formData, 'allocatedCapital');
  const reservedMargin = getNumber(formData, 'reservedMargin');
  const realizedPnl = getNumber(formData, 'realizedPnl');
  const unrealizedPnl = getNumber(formData, 'unrealizedPnl');
  const fees = getNumber(formData, 'fees');
  const funding = getNumber(formData, 'funding');
  const effectiveAt = getString(formData, 'effectiveAt');
  const clientRequestId = getString(formData, 'clientRequestId');
  const confirmLargeChange = getString(formData, 'confirmLargeChange') === 'true';

  if (
    !poolId ||
    grossEquity === null ||
    cashBalance === null ||
    allocatedCapital === null ||
    reservedMargin === null ||
    realizedPnl === null ||
    unrealizedPnl === null ||
    fees === null ||
    funding === null
  ) {
    return respondToPoolMark(request, redirectUrl, 'invalid');
  }

  // Sign sanity: these are balances, not deltas. Only PnL may be negative.
  const nonNegatives: Array<[string, number]> = [
    ['Total equity', grossEquity],
    ['Cash balance', cashBalance],
    ['Allocated capital', allocatedCapital],
    ['Reserved margin', reservedMargin],
    ['Fees', fees],
    ['Funding', funding],
  ];
  const negative = nonNegatives.find(([, value]) => value < 0);

  if (negative) {
    return respondToPoolMark(request, redirectUrl, 'invalid', `${negative[0]} cannot be negative.`);
  }

  const parsedEffectiveAt = parseOptionalIsoDate(effectiveAt);

  if (parsedEffectiveAt === null) {
    return respondToPoolMark(request, redirectUrl, 'invalid', 'Effective time is not a valid date.');
  }

  // Double-submit dedupe (per instance): a retried request with the same id
  // reports success without posting a second mark.
  if (clientRequestId && isDuplicateRequest(clientRequestId)) {
    return respondToPoolMark(
      request,
      redirectUrl,
      'posted',
      'Pool NAV mark already posted (duplicate request ignored).',
    );
  }

  // Large-change gate: compare against the pool's latest mark.
  let previousEquity: number | null = null;

  try {
    const records = await listPoolMarkingRecords();
    const pool = records.pools.find((candidate) => candidate.pool.id === poolId);
    previousEquity = pool?.latestNav?.grossEquity ?? null;
  } catch (error) {
    console.warn('[pool-nav-marks] Could not load previous mark for plausibility check.', error);
  }

  if (previousEquity !== null && previousEquity > 0) {
    const changeRatio = Math.abs(grossEquity - previousEquity) / previousEquity;

    if (changeRatio > LARGE_CHANGE_RATIO && !confirmLargeChange) {
      return respondToPoolMark(
        request,
        redirectUrl,
        'confirm-required',
        `Total equity moves ${(changeRatio * 100).toFixed(1)}% from the last mark (${previousEquity.toFixed(2)} → ${grossEquity.toFixed(2)}). Confirm the large change and repost.`,
      );
    }
  }

  const posted = await postPoolNavMark({
    allocatedCapital,
    cashBalance,
    effectiveAt: parsedEffectiveAt,
    fees,
    funding,
    grossEquity,
    poolId,
    realizedPnl,
    reservedMargin,
    unrealizedPnl,
  });

  if (posted) {
    await recordOperatorNavActivity(poolId, previousEquity, grossEquity);
  }

  return respondToPoolMark(request, redirectUrl, posted ? 'posted' : 'failed');
}
