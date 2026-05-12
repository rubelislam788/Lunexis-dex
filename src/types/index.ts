// src/types/index.ts

export type Page = "landing" | "missions" | "quest-detail" | "leaderboard" | "rewards" | "stats" | "swap" | "bridge";

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
