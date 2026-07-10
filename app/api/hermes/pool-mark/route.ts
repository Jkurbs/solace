import { NextResponse } from 'next/server';

import { safeSecretEquals } from '@/lib/secret-compare';

import { trackOpenPathsFromMark } from '@/features/hermes-ledger/path-tracking';
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

  return typeof provided === 'string' && provided.length > 0 ? safeSecretEquals(provided, expected) : false;
}

function getNumber(value: unknown) {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;

  return Number.isFinite(parsed) ? parsed : null;
}

function getAssetFromSymbol(value: unknown) {
  const raw = typeof value === 'string' ? value.trim().toUpperCase() : '';

  if (!raw) {
    return '';
  }

  return raw.split(/[-/:]/)[0] ?? raw;
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

function getPositionSide(value: unknown): PoolAllocationSide {
  return typeof value === 'string' && value.toUpperCase() === 'SHORT' ? 'SHORT' : 'LONG';
}

function getPositionExposure(position: Record<string, unknown>) {
  const notional = getNumber(position.notional);

  if (notional !== null && notional > 0) {
    return notional;
  }

  const contracts = Math.abs(getNumber(position.contracts) ?? 0);
  const markPrice = getNumber(position.mark_price) ?? getNumber(position.markPrice) ?? 0;

  return contracts > 0 && markPrice > 0 ? contracts * markPrice : 0;
}

function getPositionMarginEstimate(position: Record<string, unknown>) {
  const exposure = getPositionExposure(position);
  const leverage = getNumber(position.leverage) ?? 0;

  return exposure > 0 && leverage > 0 ? exposure / leverage : 0;
}

function parseAllocationItems(
  value: unknown,
  allocationBasis: PoolAllocationBasis,
): PoolAllocationMarkInput['allocations'] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.reduce<PoolAllocationMarkInput['allocations']>((items, item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return items;
    }

    const candidate = item as Record<string, unknown>;
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
}

function parsePositionAllocationItems({
  allocationBasis,
  cashBalance,
  positions,
  reservedMargin,
}: {
  allocationBasis: PoolAllocationBasis;
  cashBalance: number;
  positions: unknown;
  reservedMargin: number;
}): PoolAllocationMarkInput['allocations'] {
  if (!Array.isArray(positions)) {
    return [];
  }

  const positionRows = positions
    .map((position) => {
      if (!position || typeof position !== 'object' || Array.isArray(position)) {
        return null;
      }

      const candidate = position as Record<string, unknown>;
      const asset = getAssetFromSymbol(candidate.symbol ?? candidate.exchange_symbol ?? candidate.exchangeSymbol);
      const exposureUsd = getPositionExposure(candidate);
      const estimatedMarginUsd = getPositionMarginEstimate(candidate);

      if (!asset || exposureUsd <= 0) {
        return null;
      }

      return {
        asset,
        estimatedMarginUsd,
        exposureUsd,
        side: getPositionSide(candidate.side),
      };
    })
    .filter((position): position is NonNullable<typeof position> => Boolean(position));
  const estimatedMarginTotal = positionRows.reduce((total, position) => total + position.estimatedMarginUsd, 0);
  const marginScale = estimatedMarginTotal > 0 && reservedMargin > 0 ? reservedMargin / estimatedMarginTotal : 1;
  const strategyRows = positionRows.map((position) => ({
    ...position,
    marginUsd: Math.max(0, position.estimatedMarginUsd * marginScale),
  }));
  const totalCapitalBasis = cashBalance + strategyRows.reduce((total, position) => total + position.marginUsd, 0);
  const allocations: PoolAllocationMarkInput['allocations'] = [
    ...strategyRows.map((position) => ({
      allocationBasis,
      asset: position.asset,
      exposureUsd: position.exposureUsd,
      marginUsd: position.marginUsd,
      percentage: totalCapitalBasis > 0 ? (position.marginUsd / totalCapitalBasis) * 100 : 0,
      side: position.side,
    })),
    ...(cashBalance > 0
      ? [
          {
            allocationBasis,
            asset: 'Cash',
            exposureUsd: cashBalance,
            marginUsd: cashBalance,
            percentage: totalCapitalBasis > 0 ? (cashBalance / totalCapitalBasis) * 100 : 0,
            side: 'CASH' as const,
          },
        ]
      : []),
  ];

  return allocations.filter((allocation) => allocation.percentage > 0);
}

function getCashOnlyAllocation(allocationBasis: PoolAllocationBasis, cashBalance: number) {
  if (cashBalance <= 0) {
    return [];
  }

  return [
    {
      allocationBasis,
      asset: 'Cash',
      exposureUsd: cashBalance,
      marginUsd: cashBalance,
      percentage: 100,
      side: 'CASH' as const,
    },
  ] satisfies PoolAllocationMarkInput['allocations'];
}

function parseAllocationMarkPayload(
  payload: Record<string, unknown>,
  {
    allocatedCapital,
    cashBalance,
    effectiveAt,
    poolId,
    reservedMargin,
  }: {
    allocatedCapital: number;
    cashBalance: number;
    effectiveAt?: string;
    poolId: string;
    reservedMargin: number;
  },
): PoolAllocationMarkInput | null {
  const allocationBasis = getAllocationBasis(payload.allocationBasis) ?? 'capital';
  let allocations = parseAllocationItems(payload.allocations, allocationBasis);

  if (!allocations.length) {
    allocations = parsePositionAllocationItems({
      allocationBasis,
      cashBalance,
      positions: payload.positions,
      reservedMargin,
    });
  }

  if (!allocations.length && allocatedCapital <= 0 && reservedMargin <= 0) {
    allocations = getCashOnlyAllocation(allocationBasis, cashBalance);
  }

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
      allocatedCapital,
      cashBalance,
      effectiveAt: navMark.effectiveAt,
      poolId,
      reservedMargin,
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

  // New positions in this mark seal open rows in the public ledger —
  // commitment on the chain before the outcome exists. Best-effort.
  await trackOpenPathsFromMark(payload.sourceMark.rawPayload, payload.sourceMark.effectiveAt);

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
