import { NextResponse } from 'next/server';

import { getPersistedAccountBundle } from '@/features/accounts/store';
import { ensureApprovedAccountRecordsForAccountId } from '@/features/access-review/store';
import { getDashboardAccountId, hasDashboardAccess } from '@/features/hermes-dashboard/access';
import { getDashboardOnboardingState } from '@/features/hermes-dashboard/preferences';
import { postSimulatedDashboardDeposit, recordStripeDepositSession } from '@/features/ledger/store';
import { getStripeServerClient } from '@/lib/stripe/server';
import { getPrivyServerClient, validateUserSmartAccount } from '@/lib/privy/server';

const validTypes = new Set(['deposit', 'withdraw']);
const minimumDepositAmount = 1;

/**
 * Extracts the base origin URL from the incoming request structure
 */
function getRequestOrigin(request: Request) {
  return new URL(request.url).origin;
}

/**
 * Normalizes input entries into sanitized float numbers representing USD dollars
 */
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

/**
 * Converts standard dollar values directly into cents for Stripe calculation alignment
 */
function dollarsToCents(amount: number) {
  return Math.round(amount * 100);
}

/**
 * Safe utility to force expire an unused standard Checkout session if database logging errors out
 */
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
  // Validate standard authenticated dashboard access parameters
  const hasAccess = await hasDashboardAccess();
  const accountId = await getDashboardAccountId();
  
  // Set up an explicit rule path for guest users testing the front-end simulation tier
  const isGuest = !hasAccess && accountId === null;

  if (!hasAccess && !isGuest) {
    return NextResponse.json({ message: 'Dashboard access required.' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { amount?: unknown; type?: string; smartAccountAddress?: string } | null;
  const type = body?.type;
  const clientProvidedSmartAccount = body?.smartAccountAddress;

  if (!type || !validTypes.has(type)) {
    return NextResponse.json({ message: 'Invalid money movement type.' }, { status: 400 });
  }

  if (type === 'withdraw') {
    return NextResponse.json({
      message: 'Withdrawals become available after account activation and operator review.',
    });
  }

  // Real non-guest users must clear the active Solace account invitation checks
  // if (!isGuest && !accountId) {
  //   return NextResponse.json({ message: 'Deposits require an approved Solace account invite.' }, { status: 409 });
  // }

  let bundle = null;
  let onboarding = null;
  let isSimulationMode = isGuest;

  if (!isGuest && accountId) {
    [bundle, onboarding] = await Promise.all([
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

    // Force strict identity checks only for real profiles running production channels
    if (onboarding?.identityVerification?.status !== 'VERIFIED') {
      return NextResponse.json(
        {
          message: 'Identity verification is required before deposits, including simulation. Complete verification from the dashboard, then try again.',
        },
        { status: 403 },
      );
    }

    isSimulationMode = bundle.ledgerAccount.accountMode === 'SIMULATION';
  }

  const hasRequestedAmount = body ? Object.prototype.hasOwnProperty.call(body, 'amount') : false;
  const requestedAmount = hasRequestedAmount ? parseDepositAmount(body?.amount) : null;

  if (hasRequestedAmount && requestedAmount === null) {
    return NextResponse.json({ message: 'Enter a valid deposit amount.' }, { status: 400 });
  }

  // Fallback defaults to original record intent for registered accounts or a fixed ceiling for quick guest tests
  const amount = requestedAmount ?? (isGuest ? 1000 : onboarding?.depositIntentAmount);

  if (!amount || amount < minimumDepositAmount) {
    return NextResponse.json({ message: `Deposit amount must be at least $${minimumDepositAmount}.` }, { status: 400 });
  }

  // Validate or fetch the target blockchain smart account public key
  let smartAccountAddress: string | null = null;
  
  if (clientProvidedSmartAccount) {
    if (/^0x[a-fA-F0-9]{40}$/.test(clientProvidedSmartAccount)) {
      smartAccountAddress = clientProvidedSmartAccount;
    } else {
      return NextResponse.json({ message: 'Invalid smart account address format.' }, { status: 400 });
    }
  } else if (!isGuest && accountId) {
    const privy = getPrivyServerClient();
    if (privy) {
      const validation = await validateUserSmartAccount(accountId);
      if (validation.valid) {
        smartAccountAddress = validation.address;
      }
    }
  }

  if (!smartAccountAddress) {
    return NextResponse.json({ message: 'User smart account not found. Connect your wallet via Privy first.' }, { status: 400 });
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const useCryptoOnramp = process.env.STRIPE_CRYPTO_ONRAMP_ENABLED === 'true';

  // Validate Stripe configuration for Crypto Onramp
  if (useCryptoOnramp && !stripeSecretKey) {
    return NextResponse.json(
      { message: 'Stripe Crypto Onramp is enabled but STRIPE_SECRET_KEY is not configured.' },
      { status: 500 }
    );
  }

  // Complete offline transaction loop fallback if Stripe components aren't active in dev
  if (isSimulationMode && !stripeSecretKey && !isGuest && accountId) {
    const posted = await postSimulatedDashboardDeposit({
      accountId,
      amount,
      currency: 'USD',
      occurredAt: new Date().toISOString(),
    });

    if (!posted) {
      return NextResponse.json({ message: 'Simulation ledger is unavailable. Confirm simulation-mode SQL is installed.' }, { status: 503 });
    }

    return NextResponse.json({
      message: 'Simulated capital received, routed through Solace treasury, and linked to Hermes projection.',
    });
  }

  if (!stripeSecretKey) {
    return NextResponse.json({ message: 'Stripe deposits are not configured yet.' }, { status: 503 });
  }

  const stripe = getStripeServerClient();
  const origin = getRequestOrigin(request);

  try {
    // ── STRIPE PRODUCTION CRYPTO ONRAMP INTENT SETUP ────────────────────────
    if (useCryptoOnramp) {
      const stripeApiUrl = 'https://api.stripe.com/v1/crypto/onramp_sessions';
      const bodyParams = new URLSearchParams();
      
      // Stripe Crypto Onramp API uses transaction_details for wallet configuration
      bodyParams.set('transaction_details[wallet_address]', smartAccountAddress);
      bodyParams.set('transaction_details[destination_network]', 'base');
      bodyParams.set('transaction_details[destination_currency]', 'usdc');
      bodyParams.set('source_amount', amount.toString());
      bodyParams.set('source_currency', 'usd');
      bodyParams.set('finish_url', `${origin}/dashboard?upgraded=true`);
      
      // Inject clear operational accounting tags into metadata layers
      bodyParams.set('metadata[account_id]', accountId ?? 'guest');
      bodyParams.set('metadata[account_mode]', isSimulationMode ? 'SIMULATION' : 'LIVE');
      bodyParams.set('metadata[ledger_account_id]', accountId ?? 'guest');
      bodyParams.set('metadata[purpose]', 'solace_deposit');
      bodyParams.set('metadata[solace_user]', 'true');
      bodyParams.set('metadata[smart_account]', smartAccountAddress);

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
        let errorMessage = 'Stripe REST API error';
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error?.message || errorJson.message || errorText;
        } catch {
          errorMessage = errorText || `HTTP ${response.status}`;
        }
        throw new Error(`Stripe Crypto Onramp API error: ${response.status} - ${errorMessage}`);
      }

      const onrampSession = await response.json();

      // Log session tracking criteria into internal ledger if real database records exist
      if (accountId) {
        await recordStripeDepositSession({
          accountId,
          amount,
          checkoutUrl: onrampSession.redirect_url || '',
          currency: 'USD',
          sessionId: onrampSession.id,
        });
      }

      // Return clientSecret directly so the frontend iframe instance can initialize natively
      return NextResponse.json({
        clientSecret: onrampSession.client_secret,
        url: onrampSession.redirect_url,
        message: isSimulationMode
          ? 'Opening Stripe Crypto Onramp sandbox for your simulated deposit.'
          : 'Opening Stripe Crypto Onramp. USDC will be deposited directly to your smart account.',
      });
    }

    // ── FALLBACK TIER: TRADITIONAL CHECKOUT SESSIONS ─────────────────────────
    if (!stripe) {
      throw new Error('Standard Stripe server-side instantiation client instance not found.');
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      cancel_url: `${origin}/dashboard/capital?deposit=canceled`,
      client_reference_id: accountId ?? smartAccountAddress,
      customer_email: bundle?.user.email || undefined,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: isSimulationMode ? 'Solace Hermes simulated deposit' : 'Solace Hermes deposit',
            },
            unit_amount: dollarsToCents(amount),
          },
          quantity: 1,
        },
      ],
      metadata: {
        account_mode: isSimulationMode ? 'SIMULATION' : 'LIVE',
        ledger_account_id: accountId ?? 'guest',
        purpose: 'solace_deposit',
        smart_account: smartAccountAddress,
      },
      mode: 'payment',
      success_url: `${origin}/dashboard/capital?deposit=success`,
    });
    
    if (!checkoutSession.url) {
      throw new Error('Stripe Checkout session fallback URL execution path returned null.');
    }
    
    if (accountId) {
      await recordStripeDepositSession({
        accountId,
        amount,
        checkoutUrl: checkoutSession.url,
        currency: 'USD',
        sessionId: checkoutSession.id,
      });
    }

    return NextResponse.json({
      url: checkoutSession.url,
      message: 'Redirecting to secure standard checkout portal...',
    });

  } catch (error) {
    console.error('[money-movement-endpoint] Session construction crashed:', error);
    
    // Extract more specific error information
    let errorDetails = error instanceof Error ? error.message : String(error);
    
    // Check for common Stripe API errors
    if (errorDetails.includes('Stripe Crypto Onramp API error')) {
      // This is a Stripe API error - return the specific message
      return NextResponse.json(
        { 
          message: 'Stripe Crypto Onramp setup failed.',
          error: errorDetails,
          stripeError: true
        },
        { status: 500 }
      );
    }
    
    // Generic fallback
    return NextResponse.json(
      { 
        message: 'The secure deposit terminal channel could not be constructed.',
        error: errorDetails
      },
      { status: 500 }
    );
  }
}
