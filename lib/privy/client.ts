'use client';

import { useMemo } from 'react';
import { usePrivy } from '@privy-io/react-auth';
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
 */
export function useUserSmartAccount(): UserSmartAccountState {
  const { ready: privyReady, authenticated, user } = usePrivy();
  const { client } = useSmartWallets();

  const smartAccount = useMemo(() => {
    if (!authenticated) return null;

    // 1. Prefer live smart wallet client
    const fromClient = normalizeAddress(client?.account?.address);
    if (fromClient) return fromClient;

    // 2. Fall back to persisted record on user object
    const linked = (user?.linkedAccounts ?? []).find(
      (account: any) => account.type === 'smart_wallet',
    ) as { address?: string } | undefined;

    return normalizeAddress(linked?.address);
  }, [authenticated, client?.account?.address, user?.linkedAccounts]);

  return {
    smartAccount,
    isLoading: !privyReady,
    isAuthenticated: authenticated,
    ready: privyReady,
  };
}

/**
 * Convenience wrapper around usePrivy for components needing direct auth actions.
 */
export function usePrivyUser() {
  const { login, logout, user, ready, authenticated } = usePrivy();
  return { login, logout, user, ready, authenticated };
}