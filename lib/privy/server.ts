import 'server-only';

import { PrivyClient } from '@privy-io/server-auth';

let privy: PrivyClient | null = null;

export function getPrivyServerClient() {
  // Note: Using NEXT_PUBLIC_ prefix works for server components in Next.js 15+
  // The App ID is the same for both client and server
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID || process.env.PRIVY_APP_ID;
  const secret = process.env.PRIVY_SERVER_SECRET;

  if (!appId || !secret) {
    console.warn(
      '[privy-server] Privy credentials not configured. Check NEXT_PUBLIC_PRIVY_APP_ID and PRIVY_SERVER_SECRET',
    );
    return null;
  }

  privy ??= new PrivyClient(appId, secret);
  return privy;
}

/**
 * Narrow a linked account to one that carries an `address` field.
 * `LinkedAccountWithMetadata` is a discriminated union — only wallet-like
 * variants have `address`, so this guard lets TypeScript narrow the type
 * before we access it.
 */
function isAccountWithAddress(
  account: { type: string; address?: string },
): account is { type: string; address: string } {
  return typeof account.address === 'string' && account.address.length > 0;
}

/**
 * Get a user's smart account address (ERC-4337) from Privy
 */
export async function getUserSmartAccount(userId: string) {
  const privy = getPrivyServerClient();
  if (!privy) return null;

  try {
    const user = await privy.getUser(userId);

    const smartWallet = (user.linkedAccounts ?? []).find(
      (account) =>
        account.type === 'smart_wallet' && isAccountWithAddress(account),
    );

    if (!smartWallet || !isAccountWithAddress(smartWallet)) {
      return null;
    }

    return smartWallet.address;
  } catch (error) {
    console.error('[privy-server] Failed to get user smart account:', error);
    return null;
  }
}

/**
 * Get a user's embedded EOA address from Privy
 */
export async function getUserEOA(userId: string) {
  const privy = getPrivyServerClient();
  if (!privy) return null;

  try {
    const user = await privy.getUser(userId);

    const embeddedAccount = (user.linkedAccounts ?? []).find(
      (account) =>
        account.type === 'wallet' && isAccountWithAddress(account),
    );

    if (!embeddedAccount || !isAccountWithAddress(embeddedAccount)) {
      return null;
    }

    return embeddedAccount.address;
  } catch (error) {
    console.error('[privy-server] Failed to get user EOA:', error);
    return null;
  }
}

/**
 * Verify a user has a valid smart account on Base chain
 */
export async function validateUserSmartAccount(userId: string): Promise<{
  valid: boolean;
  address: string | null;
  error?: string;
}> {
  const smartAccount = await getUserSmartAccount(userId);

  if (!smartAccount) {
    return {
      valid: false,
      address: null,
      error: 'No smart account found for user',
    };
  }

  // Basic address validation
  if (!/^0x[a-fA-F0-9]{40}$/.test(smartAccount)) {
    return {
      valid: false,
      address: smartAccount,
      error: 'Invalid smart account address format',
    };
  }

  return {
    valid: true,
    address: smartAccount,
  };
}