// src/lib/wagmi.ts
import { createConfig, http } from "wagmi";
import { sepolia, baseSepolia, arbitrumSepolia, optimismSepolia } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

// Arc Testnet chain definition
export const arcTestnet = {
  id: 1723, // Arc Testnet chain ID
  name: "Arc Testnet",
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

const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "placeholder_project_id";

export const wagmiConfig = createConfig({
  chains: [arcTestnet, sepolia, baseSepolia, arbitrumSepolia, optimismSepolia],
  connectors: [
    injected(),
    walletConnect({ projectId }),
  ],
  transports: {
    [arcTestnet.id]: http(process.env.NEXT_PUBLIC_ARC_TESTNET_RPC || "https://rpc.arc.io"),
    [sepolia.id]: http(process.env.NEXT_PUBLIC_ETH_SEPOLIA_RPC),
    [baseSepolia.id]: http(process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC),
    [arbitrumSepolia.id]: http(),
    [optimismSepolia.id]: http(),
  },
  ssr: true,
});
