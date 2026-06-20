import { NextResponse } from 'next/server';

import { updateLedgerAccountMode } from '@/features/ledger/money-movement';
import type { LedgerAccountMode } from '@/features/ledger/types';
import { hasConsoleAccess } from '@/features/solace-console/access';

const accountModes = new Set<LedgerAccountMode>(['SIMULATION', 'LIVE']);

function isAccountMode(value: unknown): value is LedgerAccountMode {
  return typeof value === 'string' && accountModes.has(value as LedgerAccountMode);
}

export async function POST(request: Request) {
  if (!(await hasConsoleAccess())) {
    return NextResponse.json({ message: 'Console access required.' }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  const accountId = formData?.get('accountId');
  const accountMode = formData?.get('accountMode');
  const redirectUrl = new URL('/console/access', request.url);

  if (typeof accountId !== 'string' || !isAccountMode(accountMode)) {
    redirectUrl.searchParams.set('mode', 'invalid');
    return NextResponse.redirect(redirectUrl, 303);
  }

  const updated = await updateLedgerAccountMode({
    accountId,
    accountMode,
  });

  redirectUrl.searchParams.set('mode', updated ? 'updated' : 'failed');
  return NextResponse.redirect(redirectUrl, 303);
}

