// src/types/index.ts

export type Page = "landing" | "missions" | "quest-detail" | "leaderboard" | "rewards" | "stats" | "swap" | "bridge" | "profile" | "admin";

export interface Quest {
  id: string;
  title: string;
  description: string;
  reward: string;
  rewardAmt: number;
  xp: number;
  difficulty: "Easy" | "Medium" | "Hard" | "Elite";
  category: string;
  progress: number;
  totalSteps: number;
  tags: string[];
  featured?: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  address: string;
  username: string;
  xp: number;
  quests: number;
  tier: string;
}

export interface SwapState {
  fromToken: string;
  toToken: string;
  fromChain: string;
  toChain: string;
  amountIn: string;
  amountOut: string;
  slippage: string;
  status: "idle" | "approving" | "swapping" | "success" | "error";
  txHash?: string;
  error?: string;
}

export type TokenSymbol = "USDC" | "EURC" | "WETH" | "ETH" | "ARC";

export interface TokenMeta {
  symbol: TokenSymbol;
  label: string;
  chain: string;
  logoSrc: string;
  accent: string;
}

export interface ActivityItem {
  id: string;
  type: "swap" | "bridge" | "mission" | "reward" | "wallet";
  title: string;
  description: string;
  timestamp: string;
  token?: TokenSymbol;
  txHash?: string;
  status?: "pending" | "completed" | "failed";
}

export interface PortfolioBalance {
  token: TokenSymbol;
  amount: string;
  displayAmount?: string;
  value: string;
  chain: string;
  isLoading?: boolean;
}

export interface UserProfile {
  walletAddress: string;
  avatarDataUrl?: string;
  username: string;
  xUsername: string;
  githubUsername: string;
  wallets: string[];
  xp: number;
  rewardsEarned: number;
  completedMissionIds: string[];
  claimedRewardIds: string[];
  activities: ActivityItem[];
  balances: PortfolioBalance[];
}

export interface BridgeState {
  fromChain: string;
  toChain: string;
  token: string;
  amount: string;
  recipientAddress: string;
  status: "idle" | "approving" | "bridging" | "success" | "error";
  txHash?: string;
  error?: string;
}
