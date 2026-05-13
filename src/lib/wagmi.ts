import { getDefaultConfig, type Chain } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { sepolia } from "wagmi/chains";

export const arcChain = {
  id: 1723,
  name: "ARC Chain",
  iconUrl: "/arc-assets/arc.jpg",
  iconBackground: "#07111f",
  nativeCurrency: { name: "ARC Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.NEXT_PUBLIC_ARC_RPC_URL || "https://rpc.arc.io"] },
  },
  blockExplorers: {
    default: { name: "ARC Scan", url: process.env.NEXT_PUBLIC_ARC_EXPLORER_URL || "https://scan.arc.io" },
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
    [arcChain.id]: http(process.env.NEXT_PUBLIC_ARC_RPC_URL || "https://rpc.arc.io"),
    [sepolia.id]: http(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || "https://rpc.sepolia.org"),
  },
});
