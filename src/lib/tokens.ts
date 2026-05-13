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
