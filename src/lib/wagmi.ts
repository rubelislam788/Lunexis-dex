import { getDefaultConfig, type Chain } from "@rainbow-me/rainbowkit";
import { fallback, http } from "wagmi";
import { ARC_TESTNET_RPC_URLS, ETHEREUM_SEPOLIA_RPC_URLS, getArcBrowserRpcUrls, normalizeRpcUrl } from "@/lib/arc-kit";
import { arcTestnetChain } from "@/lib/onchain";

export const arcChain = {
  ...arcTestnetChain,
  iconUrl: "/arc-assets/arc.jpg",
  iconBackground: "#07111f",
} satisfies Chain;

export const ethereumSepoliaChain = {
  id: 11155111,
  name: "Ethereum Sepolia",
  nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ETHEREUM_SEPOLIA_RPC_URLS.map(normalizeRpcUrl) },
    public: { http: ETHEREUM_SEPOLIA_RPC_URLS.map(normalizeRpcUrl) },
  },
  blockExplorers: {
    default: { name: "Etherscan", url: "https://sepolia.etherscan.io" },
  },
  testnet: true,
  iconUrl: "/arc-assets/usdc.svg",
  iconBackground: "#0b1220",
} satisfies Chain;

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "lunexis";
const arcTransportUrls = typeof window === "undefined" ? ARC_TESTNET_RPC_URLS : getArcBrowserRpcUrls();
const sepoliaTransportUrls = ETHEREUM_SEPOLIA_RPC_URLS.map(normalizeRpcUrl);

export const wagmiChains: readonly [Chain, ...Chain[]] = [arcChain, ethereumSepoliaChain];

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
    [ethereumSepoliaChain.id]: fallback(sepoliaTransportUrls.map((url) => http(url, { retryCount: 2, timeout: 10000 })), {
      rank: true,
      retryCount: 2,
    }),
  },
});
