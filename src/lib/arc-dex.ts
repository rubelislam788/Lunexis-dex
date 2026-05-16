import { isAddress, type Address } from "viem";
import { ARC_TESTNET_CHAIN_ID, ETHEREUM_SEPOLIA_CHAIN_ID } from "@/lib/arc-kit";

export type DexView = "dashboard" | "swap" | "liquidity" | "bridge" | "portfolio" | "admin";

export interface ArcSwapToken {
  symbol: "ARC" | "USDC" | "EURO" | "WETH" | "ETH" | string;
  name: string;
  address?: Address;
  decimals: number;
  accent: string;
  icon: string;
  chainId: number;
  isNative?: boolean;
}

export interface DexTransaction {
  id: string;
  kind: "swap" | "approve" | "liquidity-add" | "liquidity-remove" | "bridge";
  title: string;
  hash?: string;
  status: "pending" | "confirmed" | "failed";
  timestamp: string;
  details: string;
}

function parseAddress(value?: string) {
  return value && isAddress(value) ? (value as Address) : undefined;
}

export const ARC_CHAIN_ID = ARC_TESTNET_CHAIN_ID;
export const SEPOLIA_CHAIN_ID = ETHEREUM_SEPOLIA_CHAIN_ID;

export const ARC_SWAP_TOKENS: ArcSwapToken[] = [
  {
    symbol: "USDC",
    name: "USD Coin",
    address: "0xD8fBdB46F9230B952Ad820697ac940373208ea3e",
    decimals: 6,
    accent: "#2775ca",
    icon: "/arc-assets/usdc.png",
    chainId: ARC_CHAIN_ID,
  },
  {
    symbol: "EURO",
    name: "EURO",
    address: "0x588c08138f0d079E2B8457ea0Bf30861890875fb",
    decimals: 6,
    accent: "#38bdf8",
    icon: "/arc-assets/circle-usdc.jpeg",
    chainId: ARC_CHAIN_ID,
  },
  {
    symbol: "ETH",
    name: "Ether",
    decimals: 18,
    accent: "#a5b4fc",
    icon: "/arc-assets/ethereum.png",
    chainId: ARC_CHAIN_ID,
    isNative: true,
  },
];

export const DEX_CONTRACTS = {
  swapFactory: parseAddress(process.env.NEXT_PUBLIC_ARC_SWAP_FACTORY_ADDRESS),
  swapRouter: parseAddress(process.env.NEXT_PUBLIC_ARC_SWAP_ROUTER_ADDRESS),
  bridge: parseAddress(process.env.NEXT_PUBLIC_ARC_BRIDGE_CONTRACT_ADDRESS),
  lpManager: parseAddress(process.env.NEXT_PUBLIC_ARC_LP_MANAGER_ADDRESS),
  adminWallet: process.env.NEXT_PUBLIC_ADMIN_WALLET || "",
};

export const ERC20_ABI = [
  { type: "function", name: "name", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "symbol", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "allowance", stateMutability: "view", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "transfer", stateMutability: "nonpayable", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] },
] as const;

export const MOCK_WETH_ABI = [
  { type: "function", name: "faucet", stateMutability: "nonpayable", inputs: [{ name: "value", type: "uint256" }], outputs: [] },
] as const;

export const SWAP_ROUTER_ABI = [
  {
    type: "function",
    name: "swapExactInput",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenIn", type: "address" },
      { name: "tokenOut", type: "address" },
      { name: "amountIn", type: "uint256" },
      { name: "minAmountOut", type: "uint256" },
      { name: "recipient", type: "address" },
    ],
    outputs: [{ name: "amountOut", type: "uint256" }],
  },
] as const;

export const UNISWAP_V2_FACTORY_ABI = [
  { type: "function", name: "getPair", stateMutability: "view", inputs: [{ name: "tokenA", type: "address" }, { name: "tokenB", type: "address" }], outputs: [{ name: "pair", type: "address" }] },
  { type: "function", name: "createPair", stateMutability: "nonpayable", inputs: [{ name: "tokenA", type: "address" }, { name: "tokenB", type: "address" }], outputs: [{ name: "pair", type: "address" }] },
] as const;

export const UNISWAP_V2_ROUTER_ABI = [
  { type: "function", name: "factory", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "address" }] },
  { type: "function", name: "WETH", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "address" }] },
  {
    type: "function",
    name: "getAmountsOut",
    stateMutability: "view",
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "path", type: "address[]" },
    ],
    outputs: [{ name: "amounts", type: "uint256[]" }],
  },
  {
    type: "function",
    name: "swapExactTokensForTokens",
    stateMutability: "nonpayable",
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "amountOutMin", type: "uint256" },
      { name: "path", type: "address[]" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [{ name: "amounts", type: "uint256[]" }],
  },
  {
    type: "function",
    name: "addLiquidity",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenA", type: "address" },
      { name: "tokenB", type: "address" },
      { name: "amountADesired", type: "uint256" },
      { name: "amountBDesired", type: "uint256" },
      { name: "amountAMin", type: "uint256" },
      { name: "amountBMin", type: "uint256" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [
      { name: "amountA", type: "uint256" },
      { name: "amountB", type: "uint256" },
      { name: "liquidity", type: "uint256" },
    ],
  },
] as const;

export const LP_MANAGER_ABI = [
  {
    type: "function",
    name: "addLiquidity",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenA", type: "address" },
      { name: "tokenB", type: "address" },
      { name: "amountA", type: "uint256" },
      { name: "amountB", type: "uint256" },
      { name: "recipient", type: "address" },
    ],
    outputs: [{ name: "liquidityMinted", type: "uint256" }],
  },
  {
    type: "function",
    name: "removeLiquidity",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenA", type: "address" },
      { name: "tokenB", type: "address" },
      { name: "liquidity", type: "uint256" },
      { name: "recipient", type: "address" },
    ],
    outputs: [{ name: "amountA", type: "uint256" }, { name: "amountB", type: "uint256" }],
  },
] as const;

export const BRIDGE_ABI = [
  {
    type: "function",
    name: "bridgeToken",
    stateMutability: "nonpayable",
    inputs: [
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "destinationChainId", type: "uint256" },
      { name: "recipient", type: "address" },
    ],
    outputs: [],
  },
] as const;

export const DASHBOARD_SERIES = [
  { name: "Mon", volume: 142000, tvl: 480000 },
  { name: "Tue", volume: 176000, tvl: 530000 },
  { name: "Wed", volume: 194000, tvl: 560000 },
  { name: "Thu", volume: 222000, tvl: 590000 },
  { name: "Fri", volume: 241000, tvl: 640000 },
  { name: "Sat", volume: 210000, tvl: 690000 },
  { name: "Sun", volume: 268000, tvl: 740000 },
];

export const FOOTER_LINKS = [
  { label: "X", href: "https://x.com/arc" },
  { label: "Docs", href: "#" },
  { label: "Github", href: "#" },
  { label: "Status", href: "#" },
];

export const VIEW_LABELS: Record<DexView, string> = {
  dashboard: "Dashboard",
  swap: "Swap",
  liquidity: "Liquidity",
  bridge: "Bridge",
  portfolio: "Portfolio",
  admin: "Admin",
};
