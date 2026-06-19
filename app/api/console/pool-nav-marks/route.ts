import { NextResponse } from 'next/server';

import { postPoolNavMark } from '@/features/ledger/pool-marking';
import { hasConsoleAccess } from '@/features/solace-console/access';

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

function respondToPoolMark(request: Request, redirectUrl: URL, status: 'failed' | 'invalid' | 'posted') {
  if (wantsJson(request)) {
    return NextResponse.json(
      {
        message:
          status === 'posted'
            ? 'Pool NAV mark posted.'
            : status === 'invalid'
              ? 'Pool NAV mark was invalid.'
              : 'Pool NAV mark could not be posted.',
        status,
      },
      { status: status === 'posted' ? 200 : 400 },
    );
  }

  redirectUrl.searchParams.set('pool', status);
  return NextResponse.redirect(redirectUrl, 303);
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

  const parsedEffectiveAt = parseOptionalIsoDate(effectiveAt);

  if (parsedEffectiveAt === null) {
    return respondToPoolMark(request, redirectUrl, 'invalid');
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

  return respondToPoolMark(request, redirectUrl, posted ? 'posted' : 'failed');
}
