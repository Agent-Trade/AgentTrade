"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider, createConfig } from "@privy-io/wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { baseSepolia, base, mainnet } from "wagmi/chains";
import { useState } from "react";
import { http } from "viem";

// Create Wagmi config with Privy integration
// Note: Type assertions needed due to viem version conflicts in dependencies
// Mainnet is included for ENS operations (ENS contracts are on mainnet)
const wagmiConfig = createConfig({
  chains: [baseSepolia, base, mainnet] as any,
  transports: {
    [baseSepolia.id]: http() as any,
    [base.id]: http() as any,
    [mainnet.id]: http(process.env.NEXT_PUBLIC_MAINNET_RPC_URL) as any,
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClientState] = useState(() => new QueryClient());

  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ""}
      config={{
        appearance: {
          theme: "dark",
          accentColor: "#6366f1",
        },
        // Enable embedded wallet creation
        embeddedWallets: {
          ethereum: {
            createOnLogin: "users-without-wallets",
          },
        },
        // Login methods - including Google OAuth
        loginMethods: ["email", "wallet", "google"],
      }}
    >
      <QueryClientProvider client={queryClientState}>
        <WagmiProvider config={wagmiConfig as any}>{children}</WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}

