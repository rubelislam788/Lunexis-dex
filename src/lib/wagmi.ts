// src/lib/wagmi.ts
import { createConfig, http } from "wagmi";
import { injected, walletConnect } from "wagmi/connectors";
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

export const wagmiChains = [
  arcTestnet,
  sepolia,
  baseSepolia,
  arbitrumSepolia,
  optimismSepolia,
] as const;

export const wagmiConfig = createConfig({
  chains: wagmiChains,
  connectors: [
    injected(),
    walletConnect({ projectId }),
  ],
  transports: {
    [arcTestnet.id]: http("https://rpc.arc.io"),
    [sepolia.id]: http(process.env.NEXT_PUBLIC_ETH_SEPOLIA_RPC ?? "https://rpc.sepolia.org"),
    [baseSepolia.id]: http(process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC ?? "https://base-sepolia.publicnode.com"),
    [arbitrumSepolia.id]: http(process.env.NEXT_PUBLIC_ARB_SEPOLIA_RPC ?? "https://arbitrum-sepolia.publicnode.com"),
    [optimismSepolia.id]: http(process.env.NEXT_PUBLIC_OP_SEPOLIA_RPC ?? "https://optimism-sepolia.publicnode.com"),
  },
  ssr: true,
});
