import { NextResponse } from 'next/server';

import { postPoolAllocationSnapshot } from '@/features/ledger/pool-allocations';
import { postTranslatedHermesPoolMark } from '@/features/ledger/pool-marking';
import type {
  HermesPoolSourceMarkInput,
  PoolAllocationBasis,
  PoolAllocationMarkInput,
  PoolAllocationSide,
} from '@/features/ledger/types';

type ParsedHermesIngestPayload = {
  allocationMark: PoolAllocationMarkInput | null;
  sourceMark: HermesPoolSourceMarkInput;
};

const allocationBasisValues = new Set<PoolAllocationBasis>(['capital', 'exposure']);
const allocationSideValues = new Set<PoolAllocationSide>(['LONG', 'SHORT', 'CASH']);

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

function getAllocationBasis(value: unknown): PoolAllocationBasis | null {
  return typeof value === 'string' && allocationBasisValues.has(value as PoolAllocationBasis)
    ? (value as PoolAllocationBasis)
    : null;
}

function getAllocationSide(value: unknown): PoolAllocationSide | undefined {
  return typeof value === 'string' && allocationSideValues.has(value as PoolAllocationSide)
    ? (value as PoolAllocationSide)
    : undefined;
}

function parseAllocationMarkPayload(
  payload: Record<string, unknown>,
  {
    cashBalance,
    effectiveAt,
    poolId,
  }: {
    cashBalance: number;
    effectiveAt?: string;
    poolId: string;
  },
): PoolAllocationMarkInput | null {
  if (!Object.prototype.hasOwnProperty.call(payload, 'allocations')) {
    return null;
  }

  if (!Array.isArray(payload.allocations)) {
    return null;
  }

  const allocationBasis = getAllocationBasis(payload.allocationBasis) ?? 'capital';
  const allocations = payload.allocations.reduce<PoolAllocationMarkInput['allocations']>((items, value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return items;
    }

    const candidate = value as Record<string, unknown>;
    const asset = typeof candidate.asset === 'string' ? candidate.asset.trim() : '';
    const percentage = getNumber(candidate.percentage);
    const exposureUsd = getNumber(candidate.exposureUsd);
    const marginUsd = getNumber(candidate.marginUsd);

    if (!asset || percentage === null || exposureUsd === null || marginUsd === null) {
      return items;
    }

    items.push({
      allocationBasis,
      asset,
      exposureUsd,
      marginUsd,
      percentage,
      side: getAllocationSide(candidate.side),
    });

    return items;
  }, []);

  if (!allocations.length) {
    return null;
  }

  const totalExposure =
    getNumber(payload.totalExposure) ?? allocations.reduce((total, allocation) => total + allocation.exposureUsd, 0);
  const totalMargin =
    getNumber(payload.totalMargin) ??
    allocations.reduce((total, allocation) => total + (allocation.side === 'CASH' ? 0 : allocation.marginUsd), 0);

  if (totalExposure < 0 || totalMargin < 0) {
    return null;
  }

  return {
    allocationBasis,
    allocations,
    cashBalance,
    effectiveAt,
    poolId,
    totalExposure,
    totalMargin,
  };
}

function parsePoolMarkPayload(value: unknown): ParsedHermesIngestPayload | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const payload = value as Record<string, unknown>;
  const poolId = typeof payload.poolId === 'string' ? payload.poolId.trim() : '';
  const effectiveAt = typeof payload.effectiveAt === 'string' && payload.effectiveAt.trim() ? payload.effectiveAt.trim() : undefined;
  const parsedEffectiveAt = effectiveAt ? new Date(effectiveAt) : null;

  if (!poolId || (parsedEffectiveAt && Number.isNaN(parsedEffectiveAt.getTime()))) {
    return null;
  }

  const grossEquity = getNumber(payload.grossEquity);
  const cashBalance = getNumber(payload.cashBalance);
  const allocatedCapital = getNumber(payload.allocatedCapital);
  const reservedMargin = getNumber(payload.reservedMargin);
  const realizedPnl = getNumber(payload.realizedPnl);
  const unrealizedPnl = getNumber(payload.unrealizedPnl);
  const fees = getNumber(payload.fees);
  const funding = getNumber(payload.funding);

  if (
    grossEquity === null ||
    cashBalance === null ||
    allocatedCapital === null ||
    reservedMargin === null ||
    realizedPnl === null ||
    unrealizedPnl === null ||
    fees === null ||
    funding === null
  ) {
    return null;
  }

  if (grossEquity < 0 || cashBalance < 0 || allocatedCapital < 0 || reservedMargin < 0 || fees < 0 || funding < 0) {
    return null;
  }

  const navMark = {
    allocatedCapital,
    cashBalance,
    effectiveAt: parsedEffectiveAt?.toISOString(),
    fees,
    funding,
    grossEquity,
    poolId,
    realizedPnl,
    reservedMargin,
    unrealizedPnl,
  };

  return {
    allocationMark: parseAllocationMarkPayload(payload, {
      cashBalance,
      effectiveAt: navMark.effectiveAt,
      poolId,
    }),
    sourceMark: {
      ...navMark,
      rawPayload: payload,
      sourceExchange: typeof payload.sourceExchange === 'string' && payload.sourceExchange.trim() ? payload.sourceExchange.trim() : undefined,
    },
  };
}

export async function POST(request: Request) {
  if (!process.env.HERMES_INGEST_SECRET) {
    return NextResponse.json({ message: 'Hermes ingest is not configured.' }, { status: 503 });
  }

  if (!hasHermesIngestAccess(request)) {
    return NextResponse.json({ message: 'Hermes ingest access required.' }, { status: 401 });
  }

  const payload = parsePoolMarkPayload(await request.json().catch(() => null));

  if (!payload) {
    return NextResponse.json({ message: 'Invalid Hermes pool mark payload.' }, { status: 400 });
  }

  const posted = await postTranslatedHermesPoolMark(payload.sourceMark);

  if (!posted) {
    return NextResponse.json({ message: 'Hermes pool source mark could not be translated.' }, { status: 503 });
  }

  const allocationPosted = payload.allocationMark ? await postPoolAllocationSnapshot(payload.allocationMark) : null;

  if (payload.allocationMark && !allocationPosted) {
    return NextResponse.json({ message: 'Hermes NAV posted, but allocation snapshot could not be posted.' }, { status: 503 });
  }

  return NextResponse.json({
    allocationStatus: allocationPosted === null ? 'skipped' : 'posted',
    message:
      posted.status === 'applied'
        ? 'Hermes source mark translated into Solace pool NAV.'
        : posted.status === 'baseline'
          ? 'Hermes source mark stored as the pool baseline.'
          : 'Hermes source mark stored without changing Solace pool NAV.',
    navSnapshotId: posted.navSnapshotId,
    poolId: payload.sourceMark.poolId,
    sourceReturn: posted.sourceMark.sourceReturn,
    status: posted.status,
  });
}
