'use client';

import { useMemo } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useSmartWallets } from '@privy-io/react-auth/smart-wallets';

export interface UserSmartAccountState {
  smartAccount: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  ready: boolean;
}

/**
 * Normalize a Privy address into a bare 0x… hex string.
 * Privy sometimes returns CAIP-10 (eip155:8453:0x…) — the backend
 * route only accepts a bare address.
 */
function normalizeAddress(value: string | null | undefined): string | null {
  if (!value) return null;
  const bare = value.includes(':') ? value.split(':').pop() ?? '' : value;
  return /^0x[a-fA-F0-9]{40}$/.test(bare) ? bare : null;
}

/**
 * Resolves the user's smart wallet address.
 *
 * IMPORTANT: smart wallets are NOT returned by `useWallets()` — that hook
 * only lists connected wallets (embedded EOA + external wallets). Smart
 * wallets come from `useSmartWallets()` (a live client) or from
 * `user.linkedAccounts` (a persisted record). We try both, preferring the
 * live client.
 */
export function useUserSmartAccount(): UserSmartAccountState {
  const { ready: privyReady, authenticated, user } = usePrivy();
  const { ready: walletsReady } = useWallets();
  const { client } = useSmartWallets();

  const smartAccount = useMemo(() => {
    // 1. Prefer the live smart wallet client — this is what's actually
    //    provisioned and ready to receive USDC.
    const fromClient = normalizeAddress(client?.account?.address);
    if (fromClient) return fromClient;

    // 2. Fall back to the persisted record on the user object. This covers
    //    the case where the client hasn't hydrated yet but the wallet
    //    already exists on the account.
    const linked = (user?.linkedAccounts ?? []).find(
      (account: any) => account.type === 'smart_wallet',
    ) as { address?: string } | undefined;

    return normalizeAddress(linked?.address);
  }, [client?.account?.address, user?.linkedAccounts]);

  return {
    smartAccount,
    // Consider "loading" until Privy has hydrated AND we've resolved a wallet.
    isLoading: !privyReady || !walletsReady,
    isAuthenticated: authenticated,
    ready: privyReady && walletsReady,
  };
}

/**
 * Small convenience wrapper around `usePrivy` so consumers don't have to
 * reach into the auth package directly.
 */
export function usePrivyUser() {
  const { login, logout, user, ready, authenticated } = usePrivy();
  return { login, logout, user, ready, authenticated };
}