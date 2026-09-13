'use client';

import type { ReactNode } from 'react';
import { PrivyProvider } from '@privy-io/react-auth';
import { SmartWalletsProvider } from '@privy-io/react-auth/smart-wallets';
import { base } from 'viem/chains';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        embeddedWallets: {
          ethereum: {
            createOnLogin: 'users-without-wallets',
          },
        },
        // Must match the smart-wallet network you enabled in the
        // Privy Dashboard. Base Mainnet = chain id 8453.
        defaultChain: base,
        supportedChains: [base],
        appearance: {
          theme: 'light',
          accentColor: '#1a1a1a',
          logo: '/icon.svg',
        },
      }}
    >
      <SmartWalletsProvider>
        {children}
      </SmartWalletsProvider>
    </PrivyProvider>
  );
}