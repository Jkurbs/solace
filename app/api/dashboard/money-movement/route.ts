import { NextResponse } from 'next/server';

import { getPersistedAccountBundle } from '@/features/accounts/store';
import { ensureApprovedAccountRecordsForAccountId } from '@/features/access-review/store';
import { getDashboardAccountId, hasDashboardAccess } from '@/features/hermes-dashboard/access';
import { getDashboardOnboardingState } from '@/features/hermes-dashboard/preferences';
import { postSimulatedDashboardDeposit, recordStripeDepositSession } from '@/features/ledger/store';
import { getStripeServerClient } from '@/lib/stripe/server';

const validTypes = new Set(['deposit', 'withdraw']);
const minimumDepositAmount = 1;

function getRequestOrigin(request: Request) {
  return new URL(request.url).origin;
}

function parseDepositAmount(value: unknown) {
  if (typeof value !== 'number' && typeof value !== 'string') {
    return null;
  }

  const amount = typeof value === 'number' ? value : Number(value.replace(/[$,\s]/g, ''));

  if (!Number.isFinite(amount)) {
    return null;
  }

  return Math.round(amount * 100) / 100;
}

function dollarsToCents(amount: number) {
  return Math.round(amount * 100);
}

async function expireCheckoutSession(sessionId: string) {
  const stripe = getStripeServerClient();

  if (!stripe) {
    return;
  }

  await stripe.checkout.sessions.expire(sessionId).catch((error: unknown) => {
    console.warn('[stripe-checkout] Checkout session expiration failed.', error);
  });
}

export async function POST(request: Request) {
  if (!(await hasDashboardAccess())) {
    return NextResponse.json({ message: 'Dashboard access required.' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { amount?: unknown; type?: string } | null;
  const type = body?.type;

  if (!type || !validTypes.has(type)) {
    return NextResponse.json({ message: 'Invalid money movement type.' }, { status: 400 });
  }

  if (type === 'withdraw') {
    return NextResponse.json({
      message: 'Withdrawals become available after account activation and operator review.',
    });
  }

  const accountId = await getDashboardAccountId();

  if (!accountId) {
    return NextResponse.json({ message: 'Deposits require an approved Solace account invite.' }, { status: 409 });
  }

  let [bundle, onboarding] = await Promise.all([
    getPersistedAccountBundle(accountId),
    getDashboardOnboardingState(accountId),
  ]);

  if (!bundle) {
    bundle = await ensureApprovedAccountRecordsForAccountId(accountId);
    onboarding = await getDashboardOnboardingState(accountId);
  }

  if (!bundle) {
    return NextResponse.json({ message: 'Approved account could not be found. Open your invite link again or contact Solace.' }, { status: 404 });
  }

  const hasRequestedAmount = body ? Object.prototype.hasOwnProperty.call(body, 'amount') : false;
  const requestedAmount = hasRequestedAmount ? parseDepositAmount(body?.amount) : null;

  if (hasRequestedAmount && requestedAmount === null) {
    return NextResponse.json({ message: 'Enter a valid deposit amount.' }, { status: 400 });
  }

  const amount = requestedAmount ?? onboarding?.depositIntentAmount;

  if (!amount || amount < minimumDepositAmount) {
    return NextResponse.json({ message: `Deposit amount must be at least $${minimumDepositAmount}.` }, { status: 400 });
  }

  if (bundle.ledgerAccount.accountMode === 'SIMULATION') {
    const posted = await postSimulatedDashboardDeposit({
      accountId,
      amount,
      currency: 'USD',
      occurredAt: new Date().toISOString(),
    });

    if (!posted) {
      return NextResponse.json(
        { message: 'Simulation ledger is unavailable. Confirm simulation-mode SQL is installed.' },
        { status: 503 },
      );
    }

    return NextResponse.json({
      message: 'Simulated capital added. No real money moved.',
    });
  }

  const stripe = getStripeServerClient();

  if (!stripe) {
    return NextResponse.json({ message: 'Stripe deposits are not configured yet.' }, { status: 503 });
  }

  const origin = getRequestOrigin(request);
  const session = await stripe.checkout.sessions.create({
    cancel_url: `${origin}/dashboard?deposit=canceled`,
    client_reference_id: accountId,
    customer_email: bundle.user.email,
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Solace Hermes deposit',
          },
          unit_amount: dollarsToCents(amount),
        },
        quantity: 1,
      },
    ],
    metadata: {
      ledger_account_id: accountId,
      purpose: 'solace_deposit',
    },
    mode: 'payment',
    payment_intent_data: {
      metadata: {
        ledger_account_id: accountId,
        purpose: 'solace_deposit',
      },
    },
    success_url: `${origin}/dashboard?deposit=success`,
  });

  const recorded = await recordStripeDepositSession({
    accountId,
    amount,
    checkoutUrl: session.url,
    currency: 'USD',
    sessionId: session.id,
  });

  if (!recorded) {
    await expireCheckoutSession(session.id);

    return NextResponse.json(
      { message: 'Deposit rail is unavailable because ledger persistence is not ready.' },
      { status: 503 },
    );
  }

  return NextResponse.json(
    {
      message: 'Opening Stripe Checkout for your Solace deposit.',
      url: session.url,
    },
  );
}
