// src/lib/wagmi.ts
import { configureChains, createConfig } from "wagmi";
import { jsonRpcProvider } from "wagmi/providers/jsonRpc";
import { InjectedConnector } from "wagmi/connectors/injected";
import { WalletConnectConnector } from "wagmi/connectors/walletConnect";
import { sepolia, baseSepolia, arbitrumSepolia, optimismSepolia } from "wagmi/chains";

export const arcTestnet = {
  id: 1723,
  name: "Arc Testnet",
  network: "arc-testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.arc.io"] },
    public: { http: ["https://rpc.arc.io"] },
  },
  blockExplorers: {
    default: { name: "ArcScan", url: "https://scan.arc.io" },
  },
  testnet: true,
} as const;

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "";

const { chains, publicClient } = configureChains(
  [arcTestnet, sepolia, baseSepolia, arbitrumSepolia, optimismSepolia],
  [
    jsonRpcProvider({
      rpc: (chain) => {
        if (chain.id === arcTestnet.id) {
          return { http: ["https://rpc.arc.io"] };
        }
        if (chain.id === sepolia.id) {
          return { http: [process.env.NEXT_PUBLIC_ETH_SEPOLIA_RPC ?? "https://rpc.sepolia.org"] };
        }
        if (chain.id === baseSepolia.id) {
          return { http: [process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC ?? "https://base-sepolia.publicnode.com"] };
        }
        if (chain.id === arbitrumSepolia.id) {
          return { http: [process.env.NEXT_PUBLIC_ARB_SEPOLIA_RPC ?? "https://arbitrum-sepolia.publicnode.com"] };
        }
        if (chain.id === optimismSepolia.id) {
          return { http: [process.env.NEXT_PUBLIC_OP_SEPOLIA_RPC ?? "https://optimism-sepolia.publicnode.com"] };
        }
        return null;
      },
    }),
  ]
);

export const wagmiChains = chains;

export const wagmiConfig = createConfig({
  autoConnect: true,
  connectors: [
    new InjectedConnector({ chains }),
    new WalletConnectConnector({ chains, options: { projectId } }),
  ],
  publicClient,
});
