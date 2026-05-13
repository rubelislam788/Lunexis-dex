import { isAddress, type Address } from "viem";

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

export const ARC_CHAIN_ID = 1723;
export const SEPOLIA_CHAIN_ID = 11155111;

export const ARC_SWAP_TOKENS: ArcSwapToken[] = [
  {
    symbol: "ARC",
    name: "ARC",
    address: "0x6a801562296A1Dbc9244ca3764981D21A22974d6",
    decimals: 18,
    accent: "#7dd3fc",
    icon: "/arc-assets/arc.jpg",
    chainId: ARC_CHAIN_ID,
  },
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
    symbol: "WETH",
    name: "Wrapped Ether",
    address: "0x7E24AF6B090871ebbD60f57BA0A09F27db898640",
    decimals: 18,
    accent: "#ec4899",
    icon: "/arc-assets/weth.png",
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
