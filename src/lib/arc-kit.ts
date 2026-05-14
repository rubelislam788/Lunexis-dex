// src/lib/arc-kit.ts
// Arc App Kit SDK configuration
// Docs: https://docs.arc.network/app-kit

import { createPublicClient, http, type PublicClient, type WalletClient } from "viem";

const ARC_KIT_KEY_STORAGE = "arc-kit-public-key";

export const ARC_TESTNET_CHAIN_ID = 5042002;
export const ETHEREUM_SEPOLIA_CHAIN_ID = 11155111;
export const ARC_TESTNET_RPC_URL = process.env.NEXT_PUBLIC_ARC_RPC_URL || "https://rpc.testnet.arc.network";
export const ARC_TESTNET_EXPLORER_URL = process.env.NEXT_PUBLIC_ARC_EXPLORER_URL || "https://testnet.arcscan.app";

export function normalizeRpcUrl(value: string) {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

export const SUPPORTED_CHAINS = {
  ARC_TESTNET: "Arc_Testnet",
  ETH_SEPOLIA: "Ethereum_Sepolia",
  BASE_SEPOLIA: "Base_Sepolia",
  ARB_SEPOLIA: "Arbitrum_Sepolia",
  OP_SEPOLIA: "OP_Sepolia",
} as const;

export type SupportedChain = (typeof SUPPORTED_CHAINS)[keyof typeof SUPPORTED_CHAINS];

export const SUPPORTED_TOKENS = {
  USDC: "USDC",
  EURC: "EURC",
  WETH: "WETH",
} as const;

export type SupportedToken = (typeof SUPPORTED_TOKENS)[keyof typeof SUPPORTED_TOKENS];

export const CHAIN_META: Record<SupportedChain, { label: string; color: string; icon: string }> = {
  Arc_Testnet: { label: "Arc Testnet", color: "#00dce5", icon: "⬡" },
  Ethereum_Sepolia: { label: "Ethereum Sepolia", color: "#627EEA", icon: "Ξ" },
  Base_Sepolia: { label: "Base Sepolia", color: "#0052FF", icon: "⬟" },
  Arbitrum_Sepolia: { label: "Arbitrum Sepolia", color: "#28A0F0", icon: "◆" },
  OP_Sepolia: { label: "OP Sepolia", color: "#FF0420", icon: "⬡" },
};

export async function getAppKit(): Promise<any> {
  const { AppKit } = await import("@circle-fin/app-kit");
  return new AppKit();
}

export async function getViemAdapter(walletClient: WalletClient, publicClient: PublicClient): Promise<any> {
  const { ViemAdapter } = await import("@circle-fin/adapter-viem-v2");
  const { ArcTestnet, EthereumSepolia } = await import("@circle-fin/app-kit/chains");

  return new ViemAdapter(
    {
      getPublicClient: () => publicClient,
      getWalletClient: () => walletClient,
    } as any,
    {
      addressContext: "user-controlled",
      supportedChains: [ArcTestnet, EthereumSepolia],
    } as any
  );
}

export async function getBrowserViemAdapter(): Promise<any> {
  if (typeof window === "undefined" || !("ethereum" in window) || !(window as any).ethereum) {
    throw new Error("No wallet provider found in the browser.");
  }

  const { createViemAdapterFromProvider } = await import("@circle-fin/adapter-viem-v2");
  const { ArcTestnet, EthereumSepolia } = await import("@circle-fin/app-kit/chains");

  return createViemAdapterFromProvider({
    provider: (window as any).ethereum,
    getPublicClient: ({ chain }: any) =>
      createPublicClient({
        chain,
        transport: http(
          chain?.chainId === ARC_TESTNET_CHAIN_ID
            ? normalizeRpcUrl(ARC_TESTNET_RPC_URL)
            : process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || "https://rpc.sepolia.org"
        ),
      }),
    capabilities: {
      addressContext: "user-controlled",
      supportedChains: [ArcTestnet, EthereumSepolia],
    },
  } as any);
}

export function getArcKitKey(): string {
  if (process.env.NEXT_PUBLIC_ARC_KIT_KEY) {
    return process.env.NEXT_PUBLIC_ARC_KIT_KEY;
  }

  if (typeof window !== "undefined") {
    return window.localStorage.getItem(ARC_KIT_KEY_STORAGE) ?? "";
  }

  return "";
}

export function setArcKitKey(value: string) {
  if (typeof window === "undefined") return;

  const trimmed = value.trim();
  if (trimmed) {
    window.localStorage.setItem(ARC_KIT_KEY_STORAGE, trimmed);
  } else {
    window.localStorage.removeItem(ARC_KIT_KEY_STORAGE);
  }

  window.dispatchEvent(new Event("arc-kit-key-updated"));
}

export function getAppKitResultHash(result: any): string | undefined {
  const steps = Array.isArray(result?.steps) ? result.steps : [];
  const stepWithHash = steps.find((step: any) => step?.hash || step?.txHash || step?.data?.txHash || step?.values?.txHash);

  return result?.hash ?? result?.txHash ?? stepWithHash?.hash ?? stepWithHash?.txHash ?? stepWithHash?.data?.txHash ?? stepWithHash?.values?.txHash;
}
