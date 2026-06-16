import { NextResponse } from 'next/server';

import { hasDashboardAccess } from '@/features/hermes-dashboard/access';

const validTypes = new Set(['deposit', 'withdraw']);

export async function POST(request: Request) {
  if (!(await hasDashboardAccess())) {
    return NextResponse.json({ message: 'Dashboard access required.' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { type?: string } | null;
  const type = body?.type;

  if (!type || !validTypes.has(type)) {
    return NextResponse.json({ message: 'Invalid money movement type.' }, { status: 400 });
  }

  return NextResponse.json(
    {
      message:
        type === 'deposit'
          ? 'Deposit setup is recorded. Solace will open funding when the account is ready.'
          : 'Withdrawals become available after account activation.',
    },
  );
}
