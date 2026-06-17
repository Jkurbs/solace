import { NextResponse } from 'next/server';

import { updateTreasuryTaskStatus } from '@/features/ledger/money-movement';
import type { TreasuryTaskStatus } from '@/features/ledger/types';
import { hasConsoleAccess } from '@/features/solace-console/access';

const treasuryTaskStatuses = new Set<TreasuryTaskStatus>([
  'QUEUED',
  'REVIEWING',
  'APPROVED',
  'SUBMITTED',
  'COMPLETED',
  'FAILED',
  'CANCELED',
]);

function isTreasuryTaskStatus(value: unknown): value is TreasuryTaskStatus {
  return typeof value === 'string' && treasuryTaskStatuses.has(value as TreasuryTaskStatus);
}

export async function POST(request: Request) {
  if (!(await hasConsoleAccess())) {
    return NextResponse.json({ message: 'Console access required.' }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  const taskId = formData?.get('taskId');
  const status = formData?.get('status');
  const notes = formData?.get('notes');
  const externalReference = formData?.get('externalReference');
  const redirectUrl = new URL('/console', request.url);

  if (typeof taskId !== 'string' || !isTreasuryTaskStatus(status)) {
    redirectUrl.searchParams.set('treasury', 'invalid');
    return NextResponse.redirect(redirectUrl, 303);
  }

  const updated = await updateTreasuryTaskStatus({
    externalReference: typeof externalReference === 'string' ? externalReference : null,
    notes: typeof notes === 'string' ? notes : null,
    status,
    taskId,
  });

  redirectUrl.searchParams.set('treasury', updated ? 'updated' : 'failed');

  return NextResponse.redirect(redirectUrl, 303);
}
