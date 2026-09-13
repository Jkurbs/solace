'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Loader2, X, CheckCircle2, AlertCircle, ArrowRight, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUserSmartAccount } from '@/lib/privy/client';

interface StripeOnrampModalProps {
  onClose: () => void;
  onComplete: () => void;
  defaultAmount?: string;
}

/**
 * Normalize a Privy address into a bare 0x… hex string.
 * Privy hooks sometimes return CAIP-10 (eip155:8453:0x…) — the backend
 * route only accepts a bare address.
 */
function normalizeSmartAccountAddress(value: string | null | undefined): string | null {
  if (!value) return null;
  const bare = value.includes(':') ? value.split(':').pop() ?? '' : value;
  return /^0x[a-fA-F0-9]{40}$/.test(bare) ? bare : null;
}

export function StripeOnrampModal({
  onClose,
  onComplete,
  defaultAmount = '1000',
}: StripeOnrampModalProps) {
  // The hook needs to expose a loading flag so we don't fire before the
  // smart wallet has been provisioned. If your current hook doesn't
  // return `ready`/`isLoading`, add it — otherwise you'll keep hitting the
  // "smart account not found" path on first login.
  const { smartAccount, ready = true } = useUserSmartAccount();

  const [step, setStep] = useState<'config' | 'loading' | 'onramp' | 'success' | 'error'>('config');
  const [amount, setAmount] = useState(defaultAmount);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const onrampContainerRef = useRef<HTMLDivElement>(null);
  const onrampInstanceRef = useRef<any>(null);

  const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

  // Pre-normalize once so both the UI gate and the request body agree.
  const resolvedSmartAccount = useMemo(
    () => normalizeSmartAccountAddress(smartAccount),
    [smartAccount],
  );

  /**
   * Dynamically load Stripe.js once.
   */
  useEffect(() => {
    if ((window as any).Stripe) return;

    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/';
    script.async = true;
    script.onload = () => console.log('[StripeSDK] Script loaded successfully.');
    script.onerror = () => console.error('[StripeSDK] Failed to load Stripe.js');
    document.body.appendChild(script);

    return () => {
      if (script.parentNode) script.parentNode.removeChild(script);
    };
  }, []);

  /**
   * Step 1: request an Onramp Session from the backend.
   * Now that smart wallets are enabled on the client, `resolvedSmartAccount`
   * will be populated after login. We still send it explicitly so the route
   * doesn't have to re-resolve on the server side.
   */
  const initializeOnrampSession = async () => {
    setStep('loading');
    setErrorMessage(null);

    try {
      if (!resolvedSmartAccount) {
        // Fail fast with an actionable message instead of letting the
        // backend return a generic 400.
        throw new Error(
          'Your wallet is still being prepared. Please wait a moment and try again.',
        );
      }

      const response = await fetch('/api/dashboard/money-movement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(amount),
          type: 'deposit',
          smartAccountAddress: resolvedSmartAccount,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to initialize safe deposit link.');
      }

      if (!data.clientSecret) {
        throw new Error('Onramp session response is missing the required client secret.');
      }

      setClientSecret(data.clientSecret);
      setStep('onramp');
    } catch (err) {
      console.error('[OnrampModal] Initialization error:', err);
      setErrorMessage(err instanceof Error ? err.message : 'An unexpected error occurred.');
      setStep('error');
    }
  };

  /**
   * Step 2: mount the Stripe embedded onramp iframe.
   */
  useEffect(() => {
    if (
      step !== 'onramp' ||
      !clientSecret ||
      !(window as any).Stripe ||
      !onrampContainerRef.current
    ) {
      return;
    }

    try {
      if (!stripePublishableKey) {
        throw new Error('Stripe publishable key is not configured.');
      }

      const stripe = (window as any).Stripe(stripePublishableKey);

      if (!stripe) {
        throw new Error('Stripe object initialization failed.');
      }

      if (typeof stripe.cryptoOnramp !== 'function') {
        throw new Error('Stripe.js does not support cryptoOnramp. Please use Stripe.js v8+.');
      }

      const onrampInstance = stripe.cryptoOnramp({
        clientSecret,
        appearance: { theme: 'light' },
      });

      onrampInstanceRef.current = onrampInstance;
      onrampInstance.mount(onrampContainerRef.current);

      onrampInstance.on('onramp_session_updated', (event: any) => {
        const sessionStatus = event.onrampSession?.status;
        console.log('[StripeOnrampEvent] Status updated:', sessionStatus);

        if (sessionStatus === 'fulfilled') {
          setStep('success');
          setTimeout(() => onComplete(), 3000);
        }
      });
    } catch (err) {
      console.error('[OnrampModal] Mounting execution error:', err);
      setErrorMessage('Failed to mount the secure payment terminal container.');
      setStep('error');
    }

    return () => {
      if (onrampInstanceRef.current) {
        try {
          onrampInstanceRef.current.unmount();
        } catch {
          // Suppress noise if node was already destroyed.
        }
      }
    };
  }, [step, clientSecret, stripePublishableKey, onComplete]);

  // Compute whether the config form is submittable.
  const configDisabled = !ready || !resolvedSmartAccount || !amount;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-neutral-950/40 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative z-10 flex flex-col w-full max-w-lg overflow-hidden border border-neutral-200 bg-white rounded-xl shadow-xl dark:border-neutral-800 dark:bg-[#0d0d0b]"
        >
          <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4 dark:border-neutral-800">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-neutral-500 dark:text-neutral-400" />
              <span className="font-mono text-[0.65rem] font-bold uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">
                Solace Treasury Bridge
              </span>
            </div>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-950 dark:hover:bg-neutral-900 dark:hover:text-neutral-50"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 p-6 min-h-[380px] flex flex-col justify-center">
            {step === 'config' && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-xl font-semibold text-neutral-950 dark:text-neutral-50">
                    Fund Your Trading Strategy
                  </h3>
                  <p className="mt-1.5 text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
                    Deposit real USD cash into your automated software execution account. Assets are
                    immediately routed into the active Hermes strategy track.
                  </p>
                </div>

                <div className="rounded-lg border border-neutral-100 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/40">
                  <label
                    htmlFor="modal-amount"
                    className="block text-xs font-mono uppercase tracking-wider text-neutral-500 dark:text-neutral-400"
                  >
                    Deposit Value (USD)
                  </label>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-2xl font-bold text-neutral-400">$</span>
                    <input
                      id="modal-amount"
                      type="text"
                      inputMode="decimal"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full bg-transparent text-2xl font-bold text-neutral-950 outline-none dark:text-neutral-50"
                    />
                  </div>
                </div>

                {/* Surface wallet-readiness so the user understands why the button may be disabled. */}
                {!ready && (
                  <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                    <Loader2 size={14} className="mt-0.5 animate-spin" />
                    <span>Preparing your secure wallet…</span>
                  </div>
                )}
                {ready && !resolvedSmartAccount && (
                  <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                    <AlertCircle size={14} className="mt-0.5" />
                    <span>
                      No smart wallet detected. Sign out and back in to finish provisioning your
                      account.
                    </span>
                  </div>
                )}

                <div className="space-y-2.5 text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                  <div className="flex items-start gap-2">
                    <CreditCard size={14} className="mt-0.5 text-neutral-400" />
                    <span>
                      Supports all major standard credit/debit cards instantly via institutional
                      clearing channels.
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="mt-0.5 text-emerald-500" />
                    <span>
                      Non-Custodial Alignment: Your balances settle securely into your encrypted key
                      footprint.
                    </span>
                  </div>
                </div>

                <Button
                  onClick={initializeOnrampSession}
                  disabled={configDisabled}
                  className="mt-4 w-full h-11 text-sm font-semibold gap-1.5"
                >
                  Confirm and Launch Checkout
                  <ArrowRight size={16} />
                </Button>
              </div>
            )}

            {step === 'loading' && (
              <div className="flex flex-col items-center text-center space-y-3">
                <Loader2 size={32} className="animate-spin text-neutral-400 dark:text-neutral-600" />
                <p className="text-sm font-medium text-neutral-950 dark:text-neutral-50">
                  Securing payment gateway channels...
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Configuring deterministic network addresses and compliance tracking.
                </p>
              </div>
            )}

            {step === 'onramp' && (
              <div className="w-full flex flex-col items-center">
                <div
                  id="onramp-element"
                  ref={onrampContainerRef}
                  className="w-full min-h-[360px] border-0 rounded-lg overflow-hidden"
                />
              </div>
            )}

            {step === 'success' && (
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="rounded-full bg-emerald-50 p-3 dark:bg-emerald-500/10">
                  <CheckCircle2 size={36} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-neutral-950 dark:text-neutral-50">
                    Deposit Successfully Processed
                  </h4>
                  <p className="mt-1.5 text-sm text-neutral-500 dark:text-neutral-400 max-w-sm">
                    Your balance has cleared the institutional gateway channel. Refreshing account
                    logs and allocating position blocks to Hermes now.
                  </p>
                </div>
              </div>
            )}

            {step === 'error' && (
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="rounded-full bg-red-50 p-3 dark:bg-red-500/10">
                  <AlertCircle size={36} className="text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-neutral-950 dark:text-neutral-50">
                    Connection Interrupted
                  </h4>
                  <p className="mt-1.5 text-sm text-red-600 dark:text-red-400 font-medium">
                    {errorMessage || 'The secure payment link could not be built.'}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => setStep('config')}
                  className="mt-2 text-xs"
                >
                  Return and Try Again
                </Button>
              </div>
            )}
          </div>

          <div className="bg-neutral-50 px-5 py-3 border-t border-neutral-100 text-center dark:bg-neutral-900/30 dark:border-neutral-800">
            <p className="text-[0.68rem] text-neutral-400 dark:text-neutral-500">
              Clearance infrastructure certified and powered securely by Stripe Financial.
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}