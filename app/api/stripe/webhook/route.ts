import { NextResponse } from 'next/server';
import type Stripe from 'stripe';

import { ensureApprovedAccountRecordsForAccountId } from '@/features/access-review/store';
import {
  updateAccountIdentityVerification,
  updateAccountIdentityVerificationBySessionId,
} from '@/features/accounts/store';
import type { IdentityVerificationStatus } from '@/features/hermes-dashboard/types';
import {
  listPendingStripeSettlementReferences,
  markStripeDepositSessionStatus,
  postStripeCheckoutDeposit,
  refreshStripeDepositSettlement,
  type StripeDepositSettlementInput,
} from '@/features/ledger/store';
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
    return true;
  }

  const identityVerification = {
    provider: 'stripe_identity',
    sessionId: session.id,
    status,
    updatedAt: new Date(event.created * 1000).toISOString(),
  } as const;
  const accountId = session.metadata?.ledger_account_id;

  if (accountId) {
    await ensureApprovedAccountRecordsForAccountId(accountId);
  }

  const saved = accountId
    ? await updateAccountIdentityVerification(accountId, identityVerification)
    : await updateAccountIdentityVerificationBySessionId(session.id, identityVerification);

  if (!saved) {
    console.warn('[stripe-webhook] Identity verification status could not be persisted.', {
      eventId: event.id,
      sessionId: session.id,
      status,
    });

    return false;
  }

  return true;
}

function getPaymentIntentId(session: Stripe.Checkout.Session) {
  if (!session.payment_intent) {
    return null;
  }

  return typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent.id;
}

function centsToDollars(value: number) {
  return Math.round(value) / 100;
}

function stripeTimestampToIso(value: number | null | undefined) {
  return value ? new Date(value * 1000).toISOString() : null;
}

function isExpandedCharge(value: string | Stripe.Charge | null): value is Stripe.Charge {
  return Boolean(value && typeof value !== 'string');
}

function isExpandedBalanceTransaction(
  value: string | Stripe.BalanceTransaction | null,
): value is Stripe.BalanceTransaction {
  return Boolean(value && typeof value !== 'string');
}

async function getChargeForPaymentIntent(stripe: Stripe, paymentIntent: Stripe.PaymentIntent) {
  if (!paymentIntent.latest_charge) {
    return null;
  }

  if (isExpandedCharge(paymentIntent.latest_charge)) {
    return paymentIntent.latest_charge;
  }

  return stripe.charges.retrieve(paymentIntent.latest_charge, {
    expand: ['balance_transaction'],
  });
}

async function getBalanceTransactionForCharge(stripe: Stripe, charge: Stripe.Charge) {
  if (!charge.balance_transaction) {
    return null;
  }

  if (isExpandedBalanceTransaction(charge.balance_transaction)) {
    return charge.balance_transaction;
  }

  return stripe.balanceTransactions.retrieve(charge.balance_transaction);
}

function getBalanceTransactionSourceId(balanceTransaction: Stripe.BalanceTransaction) {
  const source = balanceTransaction.source;

  if (typeof source === 'string') {
    return source;
  }

  if (source && typeof source === 'object' && 'id' in source && typeof source.id === 'string') {
    return source.id;
  }

  return null;
}

function getSettlementFromBalanceTransaction(
  balanceTransaction: Stripe.BalanceTransaction,
  fallbackChargeId: string | null,
): StripeDepositSettlementInput {
  return {
    availableOn: stripeTimestampToIso(balanceTransaction.available_on),
    balanceTransactionId: balanceTransaction.id,
    balanceType: balanceTransaction.balance_type,
    chargeId: fallbackChargeId ?? getBalanceTransactionSourceId(balanceTransaction),
    exchangeRate: balanceTransaction.exchange_rate,
    grossAmount: centsToDollars(balanceTransaction.amount),
    netAmount: centsToDollars(balanceTransaction.net),
    reportingCategory: balanceTransaction.reporting_category,
    status: balanceTransaction.status === 'available' ? 'available' : 'pending',
    stripeCreatedAt: stripeTimestampToIso(balanceTransaction.created),
    stripeFeeAmount: centsToDollars(balanceTransaction.fee),
  };
}

async function getStripeDepositSettlement(
  stripe: Stripe,
  paymentIntentId: string | null,
): Promise<StripeDepositSettlementInput | null> {
  if (!paymentIntentId) {
    return null;
  }

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ['latest_charge.balance_transaction'],
    });
    const charge = await getChargeForPaymentIntent(stripe, paymentIntent);

    if (!charge) {
      return null;
    }

    const balanceTransaction = await getBalanceTransactionForCharge(stripe, charge);

    if (!balanceTransaction || balanceTransaction.currency !== 'usd') {
      return {
        availableOn: null,
        balanceTransactionId: typeof charge.balance_transaction === 'string' ? charge.balance_transaction : null,
        balanceType: null,
        chargeId: charge.id,
        exchangeRate: null,
        grossAmount: centsToDollars(charge.amount),
        netAmount: centsToDollars(charge.amount),
        reportingCategory: null,
        status: 'unavailable',
        stripeCreatedAt: stripeTimestampToIso(charge.created),
        stripeFeeAmount: 0,
      };
    }

    return getSettlementFromBalanceTransaction(balanceTransaction, charge.id);
  } catch (error) {
    console.warn('[stripe-webhook] Stripe settlement lookup failed.', {
      error,
      paymentIntentId,
    });

    return null;
  }
}

async function refreshPendingStripeSettlements(stripe: Stripe, event: Stripe.Event) {
  const pendingSettlements = await listPendingStripeSettlementReferences();

  if (!pendingSettlements.length) {
    return true;
  }

  const updatedAt = new Date(event.created * 1000).toISOString();
  const results = await Promise.all(
    pendingSettlements.map(async ({ balanceTransactionId }) => {
      try {
        const balanceTransaction = await stripe.balanceTransactions.retrieve(balanceTransactionId);

        if (balanceTransaction.currency !== 'usd') {
          return refreshStripeDepositSettlement({
            balanceTransactionId,
            settlement: {
              availableOn: null,
              balanceTransactionId,
              balanceType: null,
              chargeId: getBalanceTransactionSourceId(balanceTransaction),
              exchangeRate: null,
              grossAmount: centsToDollars(balanceTransaction.amount),
              netAmount: centsToDollars(balanceTransaction.amount),
              reportingCategory: balanceTransaction.reporting_category,
              status: 'unavailable',
              stripeCreatedAt: stripeTimestampToIso(balanceTransaction.created),
              stripeFeeAmount: 0,
            },
            updatedAt,
          });
        }

        return refreshStripeDepositSettlement({
          balanceTransactionId,
          settlement: getSettlementFromBalanceTransaction(balanceTransaction, null),
          updatedAt,
        });
      } catch (error) {
        console.warn('[stripe-webhook] Pending settlement refresh failed.', {
          balanceTransactionId,
          error,
        });

        return false;
      }
    }),
  );

  return results.every(Boolean);
}

function isSolaceDepositSession(session: Stripe.Checkout.Session) {
  return session.metadata?.purpose === 'solace_deposit' && Boolean(session.metadata.ledger_account_id);
}

async function postCheckoutDeposit(event: Stripe.Event, stripe: Stripe) {
  const session = event.data.object as Stripe.Checkout.Session;

  if (!isSolaceDepositSession(session)) {
    return true;
  }

  if (session.payment_status !== 'paid') {
    console.info('[stripe-webhook] Checkout session completed before payment posted.', {
      eventId: event.id,
      paymentStatus: session.payment_status,
      sessionId: session.id,
    });
    return true;
  }

  const accountId = session.metadata?.ledger_account_id;
  const amount = session.amount_total ? session.amount_total / 100 : null;
  const currency = session.currency?.toUpperCase();
  const paymentIntentId = getPaymentIntentId(session);

  if (!accountId || !amount || currency !== 'USD') {
    console.warn('[stripe-webhook] Checkout deposit is missing required ledger metadata.', {
      accountId,
      amount,
      currency,
      eventId: event.id,
      sessionId: session.id,
    });

    return false;
  }

  const posted = await postStripeCheckoutDeposit({
    accountId,
    amount,
    checkoutSessionId: session.id,
    currency: 'USD',
    occurredAt: new Date(event.created * 1000).toISOString(),
    paymentIntentId,
    settlement: await getStripeDepositSettlement(stripe, paymentIntentId),
  });

  if (!posted) {
    console.warn('[stripe-webhook] Checkout deposit could not be posted.', {
      eventId: event.id,
      sessionId: session.id,
    });

    return false;
  }

  return true;
}

async function markCheckoutSession(event: Stripe.Event, status: 'expired' | 'failed') {
  const session = event.data.object as Stripe.Checkout.Session;

  if (!isSolaceDepositSession(session)) {
    return true;
  }

  return markStripeDepositSessionStatus(session.id, status);
}

export async function POST(request: Request) {
  const stripe = getStripeServerClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !webhookSecret) {
    console.warn('[stripe-webhook] Stripe webhook is not configured.');

    return NextResponse.json({ message: 'Stripe webhook is not configured.' }, { status: 503 });
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

  let processed = true;

  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded':
      processed = await postCheckoutDeposit(event, stripe);
      break;
    case 'balance.available':
      processed = await refreshPendingStripeSettlements(stripe, event);
      break;
    case 'checkout.session.async_payment_failed':
      processed = await markCheckoutSession(event, 'failed');
      break;
    case 'checkout.session.expired':
      processed = await markCheckoutSession(event, 'expired');
      break;
    case 'identity.verification_session.verified':
    case 'identity.verification_session.requires_input':
    case 'identity.verification_session.canceled':
      processed = await persistIdentityEvent(event);
      break;
    default:
      console.info('[stripe-webhook] Event received.', {
        eventId: event.id,
        type: event.type,
      });
  }

  if (!processed) {
    return NextResponse.json({ message: 'Stripe webhook processing failed.' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
