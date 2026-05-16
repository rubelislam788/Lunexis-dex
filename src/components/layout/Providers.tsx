"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { arcChain, wagmiConfig } from "@/lib/wagmi";
import WalletStatusToasts from "@/components/layout/WalletStatusToasts";

export default function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig} reconnectOnMount>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          initialChain={arcChain}
          modalSize="compact"
          theme={darkTheme({
            accentColor: "#4A9EE8",
            accentColorForeground: "#0A1A2C",
            borderRadius: "large",
            overlayBlur: "small",
          })}
        >
          <WalletStatusToasts />
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
