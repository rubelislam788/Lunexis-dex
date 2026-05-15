import { getDefaultConfig, type Chain } from "@rainbow-me/rainbowkit";
import { fallback, http } from "wagmi";
import { ARC_TESTNET_RPC_URLS, getArcBrowserRpcUrls } from "@/lib/arc-kit";
import { arcTestnetChain } from "@/lib/onchain";

export const arcChain = {
  ...arcTestnetChain,
  iconUrl: "/arc-assets/arc.jpg",
  iconBackground: "#07111f",
} satisfies Chain;

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "lunexis";
const arcTransportUrls = typeof window === "undefined" ? ARC_TESTNET_RPC_URLS : getArcBrowserRpcUrls();

export const wagmiChains: readonly [Chain, ...Chain[]] = [arcChain];

export const wagmiConfig = getDefaultConfig({
  appName: "Lunexis",
  projectId,
  chains: wagmiChains,
  ssr: true,
  transports: {
    [arcChain.id]: fallback(arcTransportUrls.map((url) => http(url, { retryCount: 2, timeout: 10000 })), {
      rank: true,
      retryCount: 2,
    }),
  },
});
