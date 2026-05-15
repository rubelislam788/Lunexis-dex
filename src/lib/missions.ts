import type { Quest } from "@/types";

const DEFAULT_MISSION_START_AT = new Date().toISOString();
const DEFAULT_MISSION_END_AT = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

const BASE_QUESTS: Quest[] = [
  { id: "q1", title: "Lunexis Swap Initiation", description: "Complete a confirmed token swap on Arc and activate your operator route.", reward: "5 USDC", rewardAmt: 5, xp: 250, difficulty: "Easy", category: "DeFi", progress: 0, totalSteps: 3, tags: ["Swap", "Arc"], featured: true, tasks: [
    { id: "q1-t1", title: "Connect wallet on Arc Testnet." },
    { id: "q1-t2", title: "Select a token pair in Swap." },
    { id: "q1-t3", title: "Confirm one onchain swap transaction." },
  ] },
  { id: "q2", title: "Arc Liquidity Signal", description: "Hold Arc ecosystem assets and refresh your live wallet balances.", reward: "8 USDC + NFT", rewardAmt: 8, xp: 400, difficulty: "Medium", category: "Portfolio", progress: 0, totalSteps: 4, tags: ["Balance", "USDC"], featured: true, tasks: [
    { id: "q2-t1", title: "Connect wallet." },
    { id: "q2-t2", title: "Open Swap." },
    { id: "q2-t3", title: "Hold a positive USDC balance." },
    { id: "q2-t4", title: "Refresh live balances." },
  ] },
  { id: "q3", title: "Stablecoin Pair Operator", description: "Hold both USDC and EURC on Arc Testnet to prove you can operate the live swap route.", reward: "12 EURC", rewardAmt: 12, xp: 600, difficulty: "Medium", category: "DeFi", progress: 0, totalSteps: 3, tags: ["USDC", "EURC"], tasks: [
    { id: "q3-t1", title: "Hold a positive USDC balance." },
    { id: "q3-t2", title: "Hold a positive EURC balance." },
    { id: "q3-t3", title: "Refresh portfolio balances." },
  ] },
  { id: "q4", title: "Route Pathfinder", description: "Complete a swap and keep gas available to prove operator capability.", reward: "25 USDC", rewardAmt: 25, xp: 1000, difficulty: "Hard", category: "Advanced", progress: 0, totalSteps: 4, tags: ["Swap", "Gas"], tasks: [
    { id: "q4-t1", title: "Complete one swap." },
    { id: "q4-t2", title: "Keep USDC available." },
    { id: "q4-t3", title: "Keep gas available on Arc." },
    { id: "q4-t4", title: "Verify both actions." },
  ] },
];

export const QUESTS: Quest[] = BASE_QUESTS.map((quest) => ({
  ...quest,
  startsAt: DEFAULT_MISSION_START_AT,
  endsAt: DEFAULT_MISSION_END_AT,
}));
