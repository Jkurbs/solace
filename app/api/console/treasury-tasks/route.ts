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

function wantsJson(request: Request) {
  return request.headers.get('accept')?.includes('application/json') ?? false;
}

function respondToTreasuryUpdate(request: Request, redirectUrl: URL, status: 'failed' | 'invalid' | 'updated') {
  if (wantsJson(request)) {
    return NextResponse.json(
      {
        message:
          status === 'updated'
            ? 'Treasury task updated.'
            : status === 'invalid'
              ? 'Treasury task request was invalid.'
              : 'Treasury task could not be updated.',
        status,
      },
      { status: status === 'updated' ? 200 : 400 },
    );
  }

  redirectUrl.searchParams.set('treasury', status);
  return NextResponse.redirect(redirectUrl, 303);
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
    return respondToTreasuryUpdate(request, redirectUrl, 'invalid');
  }

  const updated = await updateTreasuryTaskStatus({
    externalReference: typeof externalReference === 'string' ? externalReference : null,
    notes: typeof notes === 'string' ? notes : null,
    status,
    taskId,
  });

  return respondToTreasuryUpdate(request, redirectUrl, updated ? 'updated' : 'failed');
}
