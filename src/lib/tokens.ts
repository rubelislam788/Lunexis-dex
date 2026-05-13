import type { Address } from "viem";
import type { TokenMeta, TokenSymbol } from "@/types";

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
    chain: "Ethereum Sepolia",
    logoSrc: "/arc-assets/ethereum.png",
    accent: "#a5b4fc",
  },
  ARC: {
    symbol: "ARC",
    label: "Arc Chain",
    chain: "Arc Testnet",
    logoSrc: "/arc-assets/arc.jpg",
    accent: "#38bdf8",
  },
  USDC: {
    symbol: "USDC",
    label: "USD Coin",
    chain: "Arc / Sepolia",
    logoSrc: "/arc-assets/usdc.png",
    accent: "#2775ca",
  },
  EURC: {
    symbol: "EURC",
    label: "Euro Coin",
    chain: "Circle",
    logoSrc: "/arc-assets/circle-usdc.jpeg",
    accent: "#2dd4ff",
  },
};

export const SWAP_TOKENS: TokenSymbol[] = ["USDC", "EURC", "WETH"];
export const BRIDGE_TOKENS: TokenSymbol[] = ["USDC", "WETH"];
export const PORTFOLIO_TOKENS: TokenSymbol[] = ["ETH", "ARC", "USDC", "EURC", "WETH"];

export const TOKEN_DECIMALS: Record<TokenSymbol, number> = {
  ETH: 18,
  ARC: 18,
  USDC: 6,
  EURC: 6,
  WETH: 18,
};

export const TOKEN_CONTRACTS: Partial<Record<TokenSymbol, Partial<Record<number, Address>>>> = {
  ARC: {
    1723: (process.env.NEXT_PUBLIC_ARC_TOKEN_ADDRESS || "0x0000000000000000000000000000000000000000") as Address,
  },
  USDC: {
    11155111: (process.env.NEXT_PUBLIC_USDC_SEPOLIA_ADDRESS || "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238") as Address,
    1723: (process.env.NEXT_PUBLIC_USDC_ARC_ADDRESS || "0x0000000000000000000000000000000000000000") as Address,
  },
  EURC: {
    1723: (process.env.NEXT_PUBLIC_EURC_ARC_ADDRESS || "0x0000000000000000000000000000000000000000") as Address,
  },
  WETH: {
    11155111: (process.env.NEXT_PUBLIC_WETH_SEPOLIA_ADDRESS || "0xfff9976782d46cc05630d1f6ebab18b2324d6b14") as Address,
    1723: (process.env.NEXT_PUBLIC_WETH_ARC_ADDRESS || "0x0000000000000000000000000000000000000000") as Address,
  },
};
