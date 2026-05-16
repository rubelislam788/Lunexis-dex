import type { Address } from "viem";
import type { TokenMeta, TokenSymbol } from "@/types";
import { ARC_TESTNET_CHAIN_ID, ETHEREUM_SEPOLIA_CHAIN_ID } from "@/lib/arc-kit";

export const TOKEN_META: Record<TokenSymbol, TokenMeta> = {
  WETH: {
    symbol: "WETH",
    label: "Wrapped ETH",
    chain: "Arc Chain",
    logoSrc: "/arc-assets/weth.png",
    accent: "#ec4899",
  },
  ETH: {
    symbol: "ETH",
    label: "Ethereum",
    chain: "Ethereum",
    logoSrc: "/arc-assets/ethereum.png",
    accent: "#a5b4fc",
  },
  ARC: {
    symbol: "ARC",
    label: "ARC",
    chain: "ARC Chain",
    logoSrc: "/arc-assets/arc.jpg",
    accent: "#38bdf8",
  },
  USDC: {
    symbol: "USDC",
    label: "USD Coin",
    chain: "Arc Chain",
    logoSrc: "/arc-assets/usdc.png",
    accent: "#2775ca",
  },
  EURC: {
    symbol: "EURC",
    label: "EURO",
    chain: "ARC Chain",
    logoSrc: "/arc-assets/circle-usdc.jpeg",
    accent: "#2dd4ff",
  },
};

export const SWAP_TOKENS: TokenSymbol[] = ["USDC", "EURC"];
export const BRIDGE_TOKENS: TokenSymbol[] = ["USDC"];
export const PORTFOLIO_TOKENS: TokenSymbol[] = ["USDC", "EURC"];

export const TOKEN_DECIMALS: Record<TokenSymbol, number> = {
  ETH: 18,
  ARC: 18,
  USDC: 6,
  EURC: 6,
  WETH: 18,
};

export const TOKEN_CONTRACTS: Partial<Record<TokenSymbol, Partial<Record<number, Address>>>> = {
  USDC: {
    [ETHEREUM_SEPOLIA_CHAIN_ID]: (process.env.NEXT_PUBLIC_USDC_SEPOLIA_ADDRESS || "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238") as Address,
    [ARC_TESTNET_CHAIN_ID]: (process.env.NEXT_PUBLIC_USDC_ADDRESS || process.env.NEXT_PUBLIC_USDC_ARC_ADDRESS || "0x3600000000000000000000000000000000000000") as Address,
  },
  EURC: {
    [ARC_TESTNET_CHAIN_ID]: (process.env.NEXT_PUBLIC_EURC_ADDRESS || process.env.NEXT_PUBLIC_EURC_ARC_ADDRESS || "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a") as Address,
  },
};
