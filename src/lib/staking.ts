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
  allowance?: bigint;
  rewardVaultBalance?: string;
  needsApproval?: boolean;
}

function parseAddress(value?: string) {
  return value && isAddress(value) ? (value as Address) : undefined;
}

export const ARC_TESTNET_USDC_ADDRESS = "0x3600000000000000000000000000000000000000" as Address;
export const ARC_TESTNET_EURC_ADDRESS = "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a" as Address;
export const ARC_TESTNET_STAKING_MANAGER_ADDRESS = "0xe148681F1d360dB8dEDCbC6a69d3df157f28c09F" as Address;

const configuredStakingManager = parseAddress(
  process.env.NEXT_PUBLIC_STAKING_MANAGER_ADDRESS ||
  process.env.NEXT_PUBLIC_LUNEXIS_STAKING_MANAGER_ADDRESS
);

export const STAKING_MANAGER_ADDRESS =
  configuredStakingManager?.toLowerCase() === ARC_TESTNET_STAKING_MANAGER_ADDRESS.toLowerCase()
    ? configuredStakingManager
    : ARC_TESTNET_STAKING_MANAGER_ADDRESS;
export const STAKING_ADMIN_WALLET = (process.env.NEXT_PUBLIC_STAKING_ADMIN_WALLET || process.env.NEXT_PUBLIC_ADMIN_WALLET || "").toLowerCase();
export const STAKING_CHAIN_ID = ARC_TESTNET_CHAIN_ID;

export const DEFAULT_STAKING_TOKENS: StakingToken[] = [
  {
    address: ARC_TESTNET_USDC_ADDRESS,
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6,
    logoSrc: "/arc-assets/usdc.png",
    accent: "#2775ca",
  },
  {
    address: ARC_TESTNET_EURC_ADDRESS,
    name: "EURO",
    symbol: "EURC",
    decimals: 6,
    logoSrc: "/arc-assets/circle-usdc.jpeg",
    accent: "#2dd4ff",
  },
];

export const STAKING_MANAGER_ABI = [
  { type: "function", name: "getAllowedTokens", stateMutability: "view", inputs: [], outputs: [{ type: "address[]" }] },
  { type: "function", name: "pendingRewards", stateMutability: "view", inputs: [{ name: "user", type: "address" }, { name: "token", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "pendingRewards", stateMutability: "view", inputs: [{ name: "token", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "pendingRewards", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "getStakedBalance", stateMutability: "view", inputs: [{ name: "user", type: "address" }, { name: "token", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "getStakedBalance", stateMutability: "view", inputs: [{ name: "token", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "getStakedBalance", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "stake", stateMutability: "nonpayable", inputs: [{ name: "token", type: "address" }, { name: "amount", type: "uint256" }], outputs: [] },
  { type: "function", name: "stake", stateMutability: "nonpayable", inputs: [{ name: "amount", type: "uint256" }, { name: "token", type: "address" }], outputs: [] },
  { type: "function", name: "stake", stateMutability: "nonpayable", inputs: [{ name: "amount", type: "uint256" }], outputs: [] },
  { type: "function", name: "unstake", stateMutability: "nonpayable", inputs: [{ name: "token", type: "address" }, { name: "amount", type: "uint256" }], outputs: [] },
  { type: "function", name: "unstake", stateMutability: "nonpayable", inputs: [{ name: "amount", type: "uint256" }, { name: "token", type: "address" }], outputs: [] },
  { type: "function", name: "unstake", stateMutability: "nonpayable", inputs: [{ name: "amount", type: "uint256" }], outputs: [] },
  { type: "function", name: "claimRewards", stateMutability: "nonpayable", inputs: [{ name: "token", type: "address" }], outputs: [] },
  { type: "function", name: "claimRewards", stateMutability: "nonpayable", inputs: [], outputs: [] },
] as const;

export { ERC20_ABI, zeroAddress };

export function poolTypeLabel(value: number): StakingPoolType {
  return value === 1 ? "Locked" : value === 2 ? "FixedReward" : "Flexible";
}

export function poolTypeValue(value: StakingPoolType) {
  return value === "Locked" ? 1 : value === "FixedReward" ? 2 : 0;
}
