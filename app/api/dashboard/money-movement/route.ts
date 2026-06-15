import { NextResponse } from 'next/server';

import { hasDashboardAccess } from '@/features/hermes-dashboard/access';
import { getStripeServerClient } from '@/lib/stripe/server';

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

  const stripe = getStripeServerClient();

  if (!stripe) {
    return NextResponse.json({ message: 'Stripe is not configured for this environment.' }, { status: 503 });
  }

  return NextResponse.json(
    {
      message:
        type === 'deposit'
          ? 'Deposit sessions require an authenticated account and amount selection.'
          : 'Withdrawals require an authenticated account and payout rail.',
    },
    { status: 501 },
  );
}
