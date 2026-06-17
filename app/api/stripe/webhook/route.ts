import { NextResponse } from 'next/server';
import type Stripe from 'stripe';

import {
  updateAccountIdentityVerification,
  updateAccountIdentityVerificationBySessionId,
} from '@/features/accounts/store';
import type { IdentityVerificationStatus } from '@/features/hermes-dashboard/types';
import { markStripeDepositSessionStatus, postStripeCheckoutDeposit } from '@/features/ledger/store';
import { getStripeServerClient } from '@/lib/stripe/server';

export const runtime = 'nodejs';

function logIdentityEvent(event: Stripe.Event) {
  const session = event.data.object as Stripe.Identity.VerificationSession;

  console.info('[stripe-webhook] Identity event received.', {
    eventId: event.id,
    sessionId: session.id,
    status: session.status,
    type: event.type,
  });
}

function getIdentityStatusForEvent(eventType: string): IdentityVerificationStatus | null {
  switch (eventType) {
    case 'identity.verification_session.verified':
      return 'VERIFIED';
    case 'identity.verification_session.requires_input':
      return 'REQUIRES_INPUT';
    case 'identity.verification_session.canceled':
      return 'READY';
    default:
      return null;
  }
}

async function persistIdentityEvent(event: Stripe.Event) {
  const session = event.data.object as Stripe.Identity.VerificationSession;
  const status = getIdentityStatusForEvent(event.type);

  logIdentityEvent(event);

  if (!status) {
    return;
  }

  const identityVerification = {
    provider: 'stripe_identity',
    sessionId: session.id,
    status,
    updatedAt: new Date(event.created * 1000).toISOString(),
  } as const;
  const accountId = session.metadata?.ledger_account_id;
  const saved = accountId
    ? await updateAccountIdentityVerification(accountId, identityVerification)
    : await updateAccountIdentityVerificationBySessionId(session.id, identityVerification);

  if (!saved) {
    console.warn('[stripe-webhook] Identity verification status could not be persisted.', {
      eventId: event.id,
      sessionId: session.id,
      status,
    });
  }
}

function getPaymentIntentId(session: Stripe.Checkout.Session) {
  if (!session.payment_intent) {
    return null;
  }

  return typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent.id;
}

function isSolaceDepositSession(session: Stripe.Checkout.Session) {
  return session.metadata?.purpose === 'solace_deposit' && Boolean(session.metadata.ledger_account_id);
}

async function postCheckoutDeposit(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;

  if (!isSolaceDepositSession(session)) {
    return;
  }

  if (session.payment_status !== 'paid') {
    console.info('[stripe-webhook] Checkout session completed before payment posted.', {
      eventId: event.id,
      paymentStatus: session.payment_status,
      sessionId: session.id,
    });
    return;
  }

  const accountId = session.metadata?.ledger_account_id;
  const amount = session.amount_total ? session.amount_total / 100 : null;
  const currency = session.currency?.toUpperCase();

  if (!accountId || !amount || currency !== 'USD') {
    console.warn('[stripe-webhook] Checkout deposit is missing required ledger metadata.', {
      accountId,
      amount,
      currency,
      eventId: event.id,
      sessionId: session.id,
    });
    return;
  }

  const posted = await postStripeCheckoutDeposit({
    accountId,
    amount,
    checkoutSessionId: session.id,
    currency: 'USD',
    occurredAt: new Date(event.created * 1000).toISOString(),
    paymentIntentId: getPaymentIntentId(session),
  });

  if (!posted) {
    console.warn('[stripe-webhook] Checkout deposit could not be posted.', {
      eventId: event.id,
      sessionId: session.id,
    });
  }
}

async function markCheckoutSession(event: Stripe.Event, status: 'expired' | 'failed') {
  const session = event.data.object as Stripe.Checkout.Session;

  if (!isSolaceDepositSession(session)) {
    return;
  }

  await markStripeDepositSessionStatus(session.id, status);
}

export async function POST(request: Request) {
  const stripe = getStripeServerClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !webhookSecret) {
    console.warn('[stripe-webhook] Stripe webhook is not configured.');

    return NextResponse.json({ received: true });
  }

  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ message: 'Missing Stripe signature.' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, webhookSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid Stripe webhook signature.';

    return NextResponse.json({ message }, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded':
      await postCheckoutDeposit(event);
      break;
    case 'checkout.session.async_payment_failed':
      await markCheckoutSession(event, 'failed');
      break;
    case 'checkout.session.expired':
      await markCheckoutSession(event, 'expired');
      break;
    case 'identity.verification_session.verified':
    case 'identity.verification_session.requires_input':
    case 'identity.verification_session.canceled':
      await persistIdentityEvent(event);
      break;
    default:
      console.info('[stripe-webhook] Event received.', {
        eventId: event.id,
        type: event.type,
      });
  }

  return NextResponse.json({ received: true });
}
