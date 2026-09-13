import { NextResponse } from 'next/server';

import { getStripeServerClient } from '@/lib/stripe/server';
import { getUserSmartAccount } from '@/lib/privy/server';
import { getDashboardAccountId, hasDashboardAccess } from '@/features/hermes-dashboard/access';

function getRequestOrigin(request: Request) {
  return new URL(request.url).origin;
}

function dollarsToCents(amount: number) {
  return Math.round(amount * 100);
}

/**
 * Create a Stripe Crypto Onramp session using the REST API directly
 * Uses /v1/crypto/onramp_sessions endpoint
 * 
 * Parameters are nested under transaction_details:
 * - transaction_details[wallet_address]
 * - transaction_details[destination_network]
 * - transaction_details[destination_currency]
 * - finish_url (not success_url/cancel_url)
 */
async function createCryptoOnrampSession(
  stripeSecretKey: string,
  params: {
    wallet_address: string;
    network: string;
    currency: string;
    finish_url: string;
    metadata?: Record<string, string>;
  }
) {
  // Correct Crypto Onramp Sessions API endpoint
  const stripeApiUrl = 'https://api.stripe.com/v1/crypto/onramp_sessions';
  
  // Build form-encoded body with nested transaction_details
  const bodyParams = new URLSearchParams();
  
  // Required: wallet address
  bodyParams.set('transaction_details[wallet_address]', params.wallet_address);
  
  // Required: destination network (e.g., "base", "ethereum")
  bodyParams.set('transaction_details[destination_network]', params.network);
  
  // Optional: pre-select destination currency (e.g., "usdc")
  bodyParams.set('transaction_details[destination_currency]', params.currency);
  
  // Source currency (required for the conversion)
  bodyParams.set('source_currency', 'usd');
  
  // Finish URL - where user returns after onramp completes
  bodyParams.set('finish_url', params.finish_url);
  
  // Metadata
  if (params.metadata) {
    for (const [key, value] of Object.entries(params.metadata)) {
      bodyParams.set(`metadata[${key}]`, value);
    }
  }
  
  const response = await fetch(stripeApiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${stripeSecretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: bodyParams.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = 'Stripe API error';
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error?.message || errorJson.message || errorText;
    } catch {
      errorMessage = errorText || `HTTP ${response.status}`;
    }
    throw new Error(`Stripe Crypto Onramp API error: ${response.status} - ${errorMessage}`);
  }

  return response.json();
}

export async function POST(request: Request) {
  // Check if user has dashboard access (including guest/simulation mode)
  const hasAccess = await hasDashboardAccess();
  const accountId = await getDashboardAccountId();
  
  // For guest users (simulation mode), we'll create an account on-demand
  // when they complete the Stripe onramp
  const isGuest = !hasAccess && accountId === null;
  
  if (!hasAccess && !isGuest) {
    return NextResponse.json(
      { message: 'Dashboard access required' },
      { status: 401 }
    );
  }

  // Get smart account address from request body (provided by Privy client-side)
  const body = await request.json().catch(() => ({})) as { smartAccountAddress?: string };
  let smartAccountAddress = body.smartAccountAddress;

  // If not provided in request, try to get from Privy server-side (for authenticated users)
  if (!smartAccountAddress && accountId) {
    const privySmartAccount = await getUserSmartAccount(accountId);
    if (privySmartAccount) {
      smartAccountAddress = privySmartAccount;
    }
  }

  if (!smartAccountAddress) {
    return NextResponse.json(
      { message: 'User wallet not found. Connect via Privy first.' },
      { status: 400 }
    );
  }

  // Validate address format
  if (!/^0x[a-fA-F0-9]{40}$/.test(smartAccountAddress)) {
    return NextResponse.json(
      { message: 'Invalid smart account address' },
      { status: 400 }
    );
  }

  const stripe = getStripeServerClient();
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  
  if (!stripeSecretKey) {
    return NextResponse.json(
      { message: 'Stripe is not configured' },
      { status: 503 }
    );
  }

  const origin = getRequestOrigin(request);
  const useCryptoOnramp = process.env.STRIPE_CRYPTO_ONRAMP_ENABLED === 'true';

  // Validate Stripe configuration for Crypto Onramp
  if (useCryptoOnramp && !stripeSecretKey) {
    return NextResponse.json(
      { message: 'Stripe Crypto Onramp is enabled but STRIPE_SECRET_KEY is not configured.' },
      { status: 500 }
    );
  }

  try {
    let session: { url: string };

    // Try Crypto Onramp first using REST API
    if (useCryptoOnramp && stripeSecretKey) {
      const onrampSession = await createCryptoOnrampSession(stripeSecretKey, {
        wallet_address: smartAccountAddress,
        network: 'base',
        currency: 'usdc',
        finish_url: `${origin}/dashboard?upgraded=true`,
        metadata: {
          account_id: accountId ?? 'guest',
          solace_user: 'true',
          smart_account: smartAccountAddress,
          purpose: 'live_upgrade',
        },
      });
      // Use redirect_url from the response
      session = { url: onrampSession.redirect_url };
    } else if (stripe) {
      // Fallback: Traditional Stripe Checkout
      // This will go to Solace treasury, but we track the user's SA
      // for future direct deposits
      const checkoutSession = await stripe.checkout.sessions.create({
        cancel_url: `${origin}/dashboard?canceled=true`,
        client_reference_id: accountId ?? smartAccountAddress,
        mode: 'payment',
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'Solace Live Trading Deposit',
                description: 'Funds will be allocated to your Hermes strategy',
              },
              // Minimum deposit - user can change in Stripe UI
              unit_amount: dollarsToCents(1),
            },
            quantity: 1,
          },
        ],
        metadata: {
          account_id: accountId ?? 'guest',
          smart_account: smartAccountAddress,
          purpose: 'live_upgrade',
          solace_user: 'true',
        },
        success_url: `${origin}/dashboard?upgraded=true`,
      });
      // checkoutSession.url is always set for valid sessions
      if (!checkoutSession.url) {
        throw new Error('Stripe session URL is null');
      }
      session = { url: checkoutSession.url };
    } else {
      throw new Error('Stripe client not initialized');
    }

    return NextResponse.json({
      url: session.url,
      message: 'Redirecting to Stripe Onramp',
    });
  } catch (error) {
    console.error('[onramp-session] Failed to create session:', error);
    return NextResponse.json(
      { 
        message: 'Failed to create deposit session',
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
