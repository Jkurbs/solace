import { NextResponse } from 'next/server';

import { getPersistedAccountBundle } from '@/features/accounts/store';
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

  // Guard: LIVE means real money can move. Refuse promotion unless every
  // account record is fully active — an account promoted early would accept
  // live deposits into an uninitialized system.
  if (accountMode === 'LIVE') {
    const bundle = await getPersistedAccountBundle(accountId).catch(() => null);
    const userActive = bundle?.user?.status === 'ACTIVE';
    const hermesActive = bundle?.hermesAccount?.status === 'ACTIVE';
    const ledgerActive = bundle?.ledgerAccount?.status === 'ACTIVE';

    if (!userActive || !hermesActive || !ledgerActive) {
      redirectUrl.searchParams.set('mode', 'blocked');
      return NextResponse.redirect(redirectUrl, 303);
    }
  }

  const updated = await updateLedgerAccountMode({
    accountId,
    accountMode,
  });

  redirectUrl.searchParams.set('mode', updated ? 'updated' : 'failed');
  return NextResponse.redirect(redirectUrl, 303);
}

