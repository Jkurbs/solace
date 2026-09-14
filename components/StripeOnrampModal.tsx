'use client';

import { useEffect, useRef, useState } from 'react';
import { loadStripeOnramp } from '@stripe/crypto';
import { usePrivy } from '@privy-io/react-auth';
import { ShieldAlert, Loader2, X } from 'lucide-react';

import { useUserSmartAccount } from '@/lib/privy/client';
import { Button } from '@/components/ui/button';

type StripeOnrampModalProps = {
  isOpen?: boolean;
  onClose: () => void;
  onComplete?: () => void;
  clientSecret?: string;
  depositAmount?: number;
};

export function StripeOnrampModal({
  isOpen = true,
  onClose,
  onComplete,
  clientSecret: initialClientSecret,
  depositAmount = 100,
}: StripeOnrampModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(
    initialClientSecret || null
  );

  const { ready, authenticated, login, logout } = usePrivy();
  const { smartAccount, ready: smartAccountReady } = useUserSmartAccount();

  // Safely resolve smart account wallet address string
  const resolvedSmartAccount: string | null = (() => {
    if (!smartAccount) return null;
    if (typeof smartAccount === 'string') return smartAccount;
    if (typeof smartAccount === 'object' && 'address' in smartAccount) {
      return (smartAccount as { address: string }).address ?? null;
    }
    return null;
  })();

  const isAuthenticated = ready && authenticated;
  const isSmartAccountLoading =
    !smartAccountReady || (isAuthenticated && !resolvedSmartAccount);

  // Sync client secret prop if injected externally
  useEffect(() => {
    if (initialClientSecret) {
      setClientSecret(initialClientSecret);
    }
  }, [initialClientSecret]);

  // Fetch client secret from backend route
  useEffect(() => {
    if (!isOpen || clientSecret || !resolvedSmartAccount) return;

    let isMounted = true;

    async function createDepositSession() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch('/api/ledger/deposit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'deposit',
            amount: depositAmount,
            smartAccountAddress: String(resolvedSmartAccount),
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(
            data.message || data.error || 'Failed to initialize deposit session.'
          );
        }

        if (isMounted) {
          if (data.clientSecret) {
            setClientSecret(data.clientSecret);
          } else if (data.url) {
            // Standard checkout fallback if Crypto Onramp is disabled
            window.location.href = data.url;
          } else {
            throw new Error('No client secret or checkout URL returned.');
          }
        }
      } catch (err: unknown) {
        if (isMounted) {
          const message =
            err instanceof Error ? err.message : 'Could not initialize session.';
          setError(message);
          setLoading(false);
        }
      }
    }

    createDepositSession();

    return () => {
      isMounted = false;
    };
  }, [isOpen, clientSecret, resolvedSmartAccount, depositAmount]);

  // Initialize and mount Stripe Embedded Onramp element directly to DOM reference
  useEffect(() => {
    if (!isOpen || !clientSecret || !resolvedSmartAccount) {
      return;
    }

    let isMounted = true;
    let onrampSession: any = null;

    async function initializeOnramp() {
      try {
        setLoading(true);
        setError(null);

        const stripeOnramp = await loadStripeOnramp(
          process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
        );

        if (!stripeOnramp) {
          throw new Error('Failed to load Stripe Crypto Onramp SDK.');
        }

        if (!isMounted || !containerRef.current) return;

        // Clear existing iframe elements before re-mounting
        containerRef.current.innerHTML = '';

        onrampSession = stripeOnramp.createSession({
          clientSecret: clientSecret!,
        });

        // Event listener for session completion from Stripe SDK
        onrampSession.addEventListener('onramp_session_updated', (e: any) => {
          const status = e?.payload?.session?.status;
          if (
            status === 'fulfillment_complete' ||
            status === 'fulfillment_processing'
          ) {
            if (onComplete) {
              onComplete();
            }
          }
        });

        // Mount directly to HTMLElement reference to avoid selector pattern errors
        onrampSession.mount(containerRef.current);
      } catch (err: unknown) {
        if (isMounted) {
          console.error('Stripe Onramp mounting error:', err);
          const message =
            err instanceof Error
              ? err.message
              : 'Failed to initialize payment gateway.';
          setError(message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    initializeOnramp();

    return () => {
      isMounted = false;
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [isOpen, clientSecret, resolvedSmartAccount, onComplete]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg rounded-xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-[#0d0d0b]">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-md p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-50"
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        <h2 className="text-xl font-semibold tracking-tight text-neutral-950 dark:text-neutral-50">
          Deposit Capital
        </h2>

        {/* State 1: User Not Logged In */}
        {!isAuthenticated && ready && (
          <div className="my-8 flex flex-col items-center justify-center text-center">
            <ShieldAlert size={36} className="text-amber-500 mb-3" />
            <h3 className="text-base font-medium text-neutral-900 dark:text-neutral-100">
              Authentication Required
            </h3>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400 max-w-sm">
              Please sign in to access your non-custodial wallet and initiate deposits.
            </p>
            <Button
              type="button"
              onClick={login}
              className="mt-6 w-full sm:w-auto"
            >
              Sign In
            </Button>
          </div>
        )}

        {/* State 2: Smart Account Provisioning */}
        {isAuthenticated && isSmartAccountLoading && (
          <div className="my-12 flex flex-col items-center justify-center text-center">
            <Loader2 className="h-8 w-8 animate-spin text-neutral-500 mb-3" />
            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Initializing smart wallet...
            </p>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              Setting up your secure deposit account
            </p>
          </div>
        )}

        {/* State 3: Smart Account Missing */}
        {isAuthenticated && !isSmartAccountLoading && !resolvedSmartAccount && (
          <div className="my-8 flex flex-col items-center justify-center text-center">
            <ShieldAlert size={36} className="text-red-500 mb-3" />
            <h3 className="text-base font-medium text-neutral-900 dark:text-neutral-100">
              No Smart Wallet Detected
            </h3>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400 max-w-sm">
              We couldn't detect a smart wallet attached to your profile. Please sign out and sign back in to finish provisioning.
            </p>
            <Button
              type="button"
              variant="secondary"
              onClick={logout}
              className="mt-6 w-full sm:w-auto"
            >
              Sign Out & Retry
            </Button>
          </div>
        )}

        {/* State 4: Embedded Onramp Terminal */}
        {isAuthenticated && resolvedSmartAccount && (
          <div className="mt-4">
            {loading && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-neutral-500 mb-2" />
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Loading Stripe checkout...
                </p>
              </div>
            )}

            {error && (
              <div className="my-4 rounded-md border border-red-500/30 bg-red-500/10 p-4 text-center text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            {/* Always keep container rendered in DOM so ref is valid */}
            <div
              ref={containerRef}
              id="onramp-element"
              className={loading ? 'hidden' : 'min-h-[420px] w-full'}
            />
          </div>
        )}
      </div>
    </div>
  );
}