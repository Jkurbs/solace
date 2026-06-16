import { NextResponse } from 'next/server';
import type Stripe from 'stripe';

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
    case 'identity.verification_session.verified':
    case 'identity.verification_session.requires_input':
    case 'identity.verification_session.canceled':
      logIdentityEvent(event);
      break;
    default:
      console.info('[stripe-webhook] Event received.', {
        eventId: event.id,
        type: event.type,
      });
  }

  return NextResponse.json({ received: true });
}
