import { isAddress, zeroAddress, type Address } from "viem";
import { ARC_TESTNET_CHAIN_ID } from "@/lib/arc-kit";
import { ERC20_ABI } from "@/lib/arc-dex";
import type { TokenSymbol } from "@/types";

export type StakingPoolType = "Flexible" | "Locked" | "FixedReward";

export interface StakingToken {
  address: Address;
  name: string;
  symbol: string;
  decimals: number;
  balance?: string;
  logoSrc?: string;
  accent: string;
  isCustom?: boolean;
}

export interface StakingPoolView {
  id: number;
  token: StakingToken;
  rewardToken: StakingToken;
  poolType: StakingPoolType;
  aprBps: number;
  lockDuration: number;
  totalStaked: string;
  userStaked: string;
  pendingReward: string;
  unlockAt?: number;
  paused: boolean;
  metadata: string;
}

function parseAddress(value?: string) {
  return value && isAddress(value) ? (value as Address) : undefined;
}

export const STAKING_MANAGER_ADDRESS = parseAddress(process.env.NEXT_PUBLIC_LUNEXIS_STAKING_MANAGER_ADDRESS || "0xbb3E8dCAe80009031D83E4433b17710b65e2e281");
export const STAKING_ADMIN_WALLET = (process.env.NEXT_PUBLIC_STAKING_ADMIN_WALLET || process.env.NEXT_PUBLIC_ADMIN_WALLET || "").toLowerCase();
export const STAKING_CHAIN_ID = ARC_TESTNET_CHAIN_ID;

export const DEFAULT_STAKING_TOKENS: StakingToken[] = [
  {
    address: (process.env.NEXT_PUBLIC_USDC_ADDRESS || process.env.NEXT_PUBLIC_USDC_ARC_ADDRESS || "0x3600000000000000000000000000000000000000") as Address,
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6,
    logoSrc: "/arc-assets/usdc.png",
    accent: "#2775ca",
  },
  {
    address: (process.env.NEXT_PUBLIC_EURC_ADDRESS || process.env.NEXT_PUBLIC_EURC_ARC_ADDRESS || "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a") as Address,
    name: "EURO",
    symbol: "EURC",
    decimals: 6,
    logoSrc: "/arc-assets/circle-usdc.jpeg",
    accent: "#2dd4ff",
  },
];

export const STAKING_MANAGER_ABI = [
  { type: "function", name: "owner", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "paused", stateMutability: "view", inputs: [], outputs: [{ type: "bool" }] },
  { type: "function", name: "poolCount", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  {
    type: "function",
    name: "pools",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [
      { name: "stakeToken", type: "address" },
      { name: "rewardToken", type: "address" },
      { name: "aprBps", type: "uint16" },
      { name: "lockDuration", type: "uint64" },
      { name: "createdAt", type: "uint64" },
      { name: "poolType", type: "uint8" },
      { name: "paused", type: "bool" },
      { name: "totalStaked", type: "uint256" },
      { name: "metadata", type: "string" },
    ],
  },
  {
    type: "function",
    name: "positions",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }, { name: "", type: "address" }],
    outputs: [
      { name: "amount", type: "uint256" },
      { name: "rewardStored", type: "uint256" },
      { name: "updatedAt", type: "uint64" },
      { name: "unlockAt", type: "uint64" },
    ],
  },
  { type: "function", name: "pendingReward", stateMutability: "view", inputs: [{ name: "poolId", type: "uint256" }, { name: "user", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "stake", stateMutability: "nonpayable", inputs: [{ name: "poolId", type: "uint256" }, { name: "amount", type: "uint256" }], outputs: [] },
  { type: "function", name: "unstake", stateMutability: "nonpayable", inputs: [{ name: "poolId", type: "uint256" }, { name: "amount", type: "uint256" }], outputs: [] },
  { type: "function", name: "claim", stateMutability: "nonpayable", inputs: [{ name: "poolId", type: "uint256" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "emergencyWithdraw", stateMutability: "nonpayable", inputs: [{ name: "poolId", type: "uint256" }], outputs: [] },
  {
    type: "function",
    name: "createPool",
    stateMutability: "nonpayable",
    inputs: [
      { name: "stakeToken", type: "address" },
      { name: "rewardToken", type: "address" },
      { name: "aprBps", type: "uint16" },
      { name: "lockDuration", type: "uint64" },
      { name: "poolType", type: "uint8" },
      { name: "metadata", type: "string" },
    ],
    outputs: [{ name: "poolId", type: "uint256" }],
  },
  { type: "function", name: "setPool", stateMutability: "nonpayable", inputs: [{ name: "poolId", type: "uint256" }, { name: "aprBps", type: "uint16" }, { name: "lockDuration", type: "uint64" }, { name: "isPaused", type: "bool" }], outputs: [] },
] as const;

export { ERC20_ABI, zeroAddress };

export function poolTypeLabel(value: number): StakingPoolType {
  return value === 1 ? "Locked" : value === 2 ? "FixedReward" : "Flexible";
}

export function poolTypeValue(value: StakingPoolType) {
  return value === "Locked" ? 1 : value === "FixedReward" ? 2 : 0;
}
