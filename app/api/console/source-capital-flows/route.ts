import { NextResponse } from 'next/server';

import { recordHermesSourceCapitalFlow } from '@/features/ledger/pool-marking';
import type { HermesSourceCapitalFlowDirection } from '@/features/ledger/types';
import { hasConsoleAccess } from '@/features/solace-console/access';

const directions = new Set<HermesSourceCapitalFlowDirection>(['SOURCE_DEPOSIT', 'SOURCE_WITHDRAWAL']);

function getString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === 'string' ? value.trim() : '';
}

function getNumber(formData: FormData, key: string) {
  const value = getString(formData, key);
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalIsoDate(value: string) {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export async function POST(request: Request) {
  if (!(await hasConsoleAccess())) {
    return NextResponse.json({ message: 'Console access required.' }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);

  if (!formData) {
    return NextResponse.json({ message: 'Source capital flow was invalid.' }, { status: 400 });
  }

  const amount = getNumber(formData, 'amount');
  const direction = getString(formData, 'direction') as HermesSourceCapitalFlowDirection;
  const effectiveAt = parseOptionalIsoDate(getString(formData, 'effectiveAt'));
  const notes = getString(formData, 'notes');
  const poolId = getString(formData, 'poolId');

  if (!poolId || amount === null || amount <= 0 || !directions.has(direction) || effectiveAt === null) {
    return NextResponse.json({ message: 'Source capital flow was invalid.' }, { status: 400 });
  }

  const flow = await recordHermesSourceCapitalFlow({
    amount,
    direction,
    effectiveAt,
    notes,
    poolId,
  });

  if (!flow) {
    return NextResponse.json({ message: 'Source capital flow could not be recorded.' }, { status: 400 });
  }

  return NextResponse.json({
    flow,
    message: 'Source capital flow recorded.',
    status: 'recorded',
  });
}
