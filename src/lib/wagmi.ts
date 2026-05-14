import { getDefaultConfig, type Chain } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { ARC_TESTNET_RPC_URL, normalizeRpcUrl } from "@/lib/arc-kit";
import { arcTestnetChain } from "@/lib/onchain";

export const arcChain = {
  ...arcTestnetChain,
  iconUrl: "/arc-assets/arc.jpg",
  iconBackground: "#07111f",
} satisfies Chain;

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "arc-swap-demo";

export const wagmiChains: readonly [Chain, ...Chain[]] = [arcChain];

export const wagmiConfig = getDefaultConfig({
  appName: "ARC Swap",
  projectId,
  chains: wagmiChains,
  ssr: true,
  transports: {
    [arcChain.id]: http(normalizeRpcUrl(ARC_TESTNET_RPC_URL)),
  },
});
