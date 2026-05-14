import { getDefaultConfig, type Chain } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { sepolia } from "wagmi/chains";
import { ARC_TESTNET_CHAIN_ID, ARC_TESTNET_EXPLORER_URL, ARC_TESTNET_RPC_URL, normalizeRpcUrl } from "@/lib/arc-kit";

export const arcChain = {
  id: ARC_TESTNET_CHAIN_ID,
  name: "Arc Testnet",
  iconUrl: "/arc-assets/arc.jpg",
  iconBackground: "#07111f",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: {
    default: { http: [normalizeRpcUrl(ARC_TESTNET_RPC_URL)] },
  },
  blockExplorers: {
    default: { name: "ArcScan", url: ARC_TESTNET_EXPLORER_URL },
  },
  testnet: true,
} satisfies Chain;

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "arc-swap-demo";

export const wagmiChains: readonly [Chain, ...Chain[]] = [arcChain, sepolia];

export const wagmiConfig = getDefaultConfig({
  appName: "ARC Swap",
  projectId,
  chains: wagmiChains,
  ssr: true,
  transports: {
    [arcChain.id]: http(normalizeRpcUrl(ARC_TESTNET_RPC_URL)),
    [sepolia.id]: http(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || "https://rpc.sepolia.org"),
  },
});
