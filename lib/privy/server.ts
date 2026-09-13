import 'server-only';

import { PrivyClient } from '@privy-io/server-auth';

let privy: PrivyClient | null = null;

export function getPrivyServerClient() {
  // Note: Using NEXT_PUBLIC_ prefix works for server components in Next.js 15+
  // The App ID is the same for both client and server
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID || process.env.PRIVY_APP_ID;
  const secret = process.env.PRIVY_SERVER_SECRET;

  if (!appId || !secret) {
    console.warn('[privy-server] Privy credentials not configured. Check NEXT_PUBLIC_PRIVY_APP_ID and PRIVY_SERVER_SECRET');
    return null;
  }

  privy ??= new PrivyClient(appId, secret);
  return privy;
}

/**
 * Get a user's smart account address (ERC-4337) from Privy
 */
export async function getUserSmartAccount(userId: string) {
  const privy = getPrivyServerClient();
  if (!privy) return null;

  try {
    const user = await privy.getUser(userId);
    return user.wallet?.address || null;
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
    const embeddedAccount = user.linkedAccounts?.find((a: any) => a.type === 'embedded');
    return embeddedAccount?.address || null;
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
