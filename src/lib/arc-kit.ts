// src/lib/arc-kit.ts
// Arc App Kit SDK configuration
// Docs: https://docs.arc.network/app-kit

import type { PublicClient, WalletClient } from "viem";

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
} as const;

export type SupportedToken = (typeof SUPPORTED_TOKENS)[keyof typeof SUPPORTED_TOKENS];

export const CHAIN_META: Record<SupportedChain, { label: string; color: string; icon: string }> = {
  Arc_Testnet: { label: "Arc Testnet", color: "#00dce5", icon: "⬡" },
  Ethereum_Sepolia: { label: "Ethereum Sepolia", color: "#627EEA", icon: "Ξ" },
  Base_Sepolia: { label: "Base Sepolia", color: "#0052FF", icon: "⬟" },
  Arbitrum_Sepolia: { label: "Arbitrum Sepolia", color: "#28A0F0", icon: "◆" },
  OP_Sepolia: { label: "OP Sepolia", color: "#FF0420", icon: "⬡" },
};

export async function getAppKit() {
  const { AppKit } = await import("@circle-fin/app-kit");
  return new AppKit();
}

export async function getViemAdapter(walletClient: WalletClient, publicClient: PublicClient) {
  const { ViemAdapter } = await import("@circle-fin/adapter-viem-v2");
  return new ViemAdapter(walletClient, { publicClient });
}

export function getArcKitKey(): string {
  return process.env.NEXT_PUBLIC_ARC_KIT_KEY ?? "";
}
