// src/lib/arc-kit.ts
// Arc App Kit SDK configuration
// Docs: https://docs.arc.network/app-kit

import type { PublicClient, WalletClient } from "viem";

const ARC_KIT_KEY_STORAGE = "arc-kit-public-key";

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

  return new ViemAdapter(
    {
      getPublicClient: () => publicClient,
      getWalletClient: () => walletClient,
    } as any,
    {
      addressContext: "user-controlled",
      supportedChains: [],
    } as any
  );
}

export async function getBrowserViemAdapter(): Promise<any> {
  if (typeof window === "undefined" || !("ethereum" in window) || !(window as any).ethereum) {
    throw new Error("No wallet provider found in the browser.");
  }

  const { createViemAdapterFromProvider } = await import("@circle-fin/adapter-viem-v2");
  return createViemAdapterFromProvider({
    provider: (window as any).ethereum,
    capabilities: {
      addressContext: "user-controlled",
      supportedChains: [],
    },
  });
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
