"use client";

import { useCallback, useEffect, useState } from "react";
import { formatUnits, isAddress, isAddressEqual, maxUint256, parseUnits, zeroAddress, type Address } from "viem";
import { useAccount, usePublicClient, useSwitchChain, useWalletClient } from "wagmi";
import {
  DEFAULT_STAKING_TOKENS,
  ERC20_ABI,
  STAKING_ADMIN_WALLET,
  STAKING_CHAIN_ID,
  STAKING_MANAGER_ABI,
  STAKING_MANAGER_ADDRESS,
  poolTypeLabel,
  poolTypeValue,
  type StakingPoolType,
  type StakingPoolView,
  type StakingToken,
} from "@/lib/staking";
import { createActivity } from "@/lib/profile";
import { useProfile } from "@/hooks/useProfile";

const CUSTOM_TOKEN_KEY = "lunexis.staking.custom-tokens.v1";

type TxStatus = "idle" | "approving" | "staking" | "unstaking" | "claiming" | "creating";
type CreatePoolInput = {
  stakeToken: Address;
  rewardToken: Address;
  apr: string;
  lockDays: string;
  poolType: StakingPoolType;
  metadata: string;
};

function tokenColor(address: string) {
  const colors = ["#38bdf8", "#8b5cf6", "#ff2db2", "#22d3ee", "#10b981", "#f59e0b"];
  return colors[Number.parseInt(address.slice(2, 4), 16) % colors.length];
}

function loadCustomTokens(): StakingToken[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(CUSTOM_TOKEN_KEY) || "[]") as StakingToken[];
    return parsed.filter((token) => isAddress(token.address));
  } catch {
    return [];
  }
}

function saveCustomTokens(tokens: StakingToken[]) {
  window.localStorage.setItem(CUSTOM_TOKEN_KEY, JSON.stringify(tokens));
}

function cleanAmount(raw: bigint, decimals: number) {
  const formatted = formatUnits(raw, decimals);
  const [whole, fraction = ""] = formatted.split(".");
  const trimmed = fraction.slice(0, decimals <= 6 ? 4 : 6).replace(/0+$/, "");
  return trimmed ? `${whole}.${trimmed}` : whole;
}

export function useStaking() {
  const { address, chainId, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient({ chainId: STAKING_CHAIN_ID });
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain();
  const { pushActivity } = useProfile();
  const [customTokens, setCustomTokens] = useState<StakingToken[]>([]);
  const [tokens, setTokens] = useState<StakingToken[]>(DEFAULT_STAKING_TOKENS);
  const [pools, setPools] = useState<StakingPoolView[]>([]);
  const [status, setStatus] = useState<TxStatus>("idle");
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");

  const managerReady = Boolean(STAKING_MANAGER_ADDRESS);
  const isAdmin = Boolean(address && STAKING_ADMIN_WALLET && address.toLowerCase() === STAKING_ADMIN_WALLET);
  const wrongNetwork = isConnected && chainId !== STAKING_CHAIN_ID;

  const ensureArcNetwork = useCallback(async () => {
    if (chainId === STAKING_CHAIN_ID) return;
    await switchChainAsync({ chainId: STAKING_CHAIN_ID });
  }, [chainId, switchChainAsync]);

  const readTokenInfo = useCallback(async (tokenAddress: string): Promise<StakingToken> => {
    if (!publicClient || !isAddress(tokenAddress)) throw new Error("Paste a valid ARC Testnet ERC20 contract address.");
    const token = tokenAddress as Address;
    const bytecode = await publicClient.getCode({ address: token });
    if (!bytecode || bytecode === "0x") throw new Error("No ERC20 contract found on ARC Testnet at this address.");

    const [name, symbol, decimals, rawBalance] = await Promise.all([
      publicClient.readContract({ address: token, abi: ERC20_ABI, functionName: "name" }),
      publicClient.readContract({ address: token, abi: ERC20_ABI, functionName: "symbol" }),
      publicClient.readContract({ address: token, abi: ERC20_ABI, functionName: "decimals" }),
      address ? publicClient.readContract({ address: token, abi: ERC20_ABI, functionName: "balanceOf", args: [address] }).catch(() => BigInt(0)) : Promise.resolve(BigInt(0)),
    ]);

    return {
      address: token,
      name: String(name),
      symbol: String(symbol),
      decimals: Number(decimals),
      balance: cleanAmount(rawBalance as bigint, Number(decimals)),
      accent: tokenColor(token),
      isCustom: true,
    };
  }, [address, publicClient]);

  const addCustomToken = useCallback(async (tokenAddress: string) => {
    setError("");
    const token = await readTokenInfo(tokenAddress);
    const exists = tokens.some((item) => isAddressEqual(item.address, token.address));
    if (exists) return token;
    const nextCustom = [token, ...customTokens].filter((item, index, list) => list.findIndex((candidate) => isAddressEqual(candidate.address, item.address)) === index);
    setCustomTokens(nextCustom);
    saveCustomTokens(nextCustom);
    setTokens([...DEFAULT_STAKING_TOKENS, ...nextCustom]);
    return token;
  }, [customTokens, readTokenInfo, tokens]);

  const refresh = useCallback(async () => {
    if (!publicClient) return;
    const managerAddress = STAKING_MANAGER_ADDRESS;
    const savedCustom = loadCustomTokens();
    setCustomTokens(savedCustom);

    const baseTokens = [...DEFAULT_STAKING_TOKENS, ...savedCustom];
    const withBalances = await Promise.all(baseTokens.map(async (token) => {
      if (!address) return token;
      try {
        const raw = await publicClient.readContract({ address: token.address, abi: ERC20_ABI, functionName: "balanceOf", args: [address] });
        return { ...token, balance: cleanAmount(raw as bigint, token.decimals) };
      } catch {
        return token;
      }
    }));
    setTokens(withBalances);
    const localTokenMap = new Map(withBalances.map((token) => [token.address.toLowerCase(), token]));

    if (!managerAddress) {
      setPools([]);
      setLastUpdated(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      return;
    }

    const count = Number(await publicClient.readContract({ address: managerAddress, abi: STAKING_MANAGER_ABI, functionName: "poolCount" }).catch(() => BigInt(0)));
    const nextPools = await Promise.all(Array.from({ length: count }).map(async (_, id) => {
      const pool: any = await publicClient.readContract({ address: managerAddress, abi: STAKING_MANAGER_ABI, functionName: "pools", args: [BigInt(id)] });
      const stakeTokenAddress = pool[0] as Address;
      const rewardTokenAddress = pool[1] as Address;
      const stakeToken = localTokenMap.get(stakeTokenAddress.toLowerCase()) ?? await readTokenInfo(stakeTokenAddress);
      const rewardToken = localTokenMap.get(rewardTokenAddress.toLowerCase()) ?? await readTokenInfo(rewardTokenAddress);
      const position: any = address
        ? await publicClient.readContract({ address: managerAddress, abi: STAKING_MANAGER_ABI, functionName: "positions", args: [BigInt(id), address] }).catch(() => [BigInt(0), BigInt(0), 0, 0])
        : [BigInt(0), BigInt(0), 0, 0];
      const pending = address
        ? await publicClient.readContract({ address: managerAddress, abi: STAKING_MANAGER_ABI, functionName: "pendingReward", args: [BigInt(id), address] }).catch(() => BigInt(0))
        : BigInt(0);

      return {
        id,
        token: stakeToken,
        rewardToken,
        aprBps: Number(pool[2]),
        lockDuration: Number(pool[3]),
        poolType: poolTypeLabel(Number(pool[5])),
        paused: Boolean(pool[6]),
        totalStaked: cleanAmount(pool[7] as bigint, stakeToken.decimals),
        metadata: String(pool[8] || ""),
        userStaked: cleanAmount(position[0] as bigint, stakeToken.decimals),
        pendingReward: cleanAmount(pending as bigint, rewardToken.decimals),
        unlockAt: Number(position[3] || 0),
      } satisfies StakingPoolView;
    }));

    setPools(nextPools);
    setLastUpdated(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
  }, [address, publicClient, readTokenInfo]);

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, 12000);
    window.addEventListener("online", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("online", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [refresh]);

  const approve = useCallback(async (pool: StakingPoolView, amount: string) => {
    const managerAddress = STAKING_MANAGER_ADDRESS;
    if (!walletClient || !publicClient || !address || !managerAddress) throw new Error("Connect wallet and configure staking manager.");
    await ensureArcNetwork();
    const value = parseUnits(amount || "0", pool.token.decimals);
    setStatus("approving");
    try {
      const allowance = await publicClient.readContract({ address: pool.token.address, abi: ERC20_ABI, functionName: "allowance", args: [address, managerAddress] });
      if ((allowance as bigint) >= value) return { hash: undefined };
      const hash = await walletClient.writeContract({ address: pool.token.address, abi: ERC20_ABI, functionName: "approve", args: [managerAddress, maxUint256], account: walletClient.account! });
      await publicClient.waitForTransactionReceipt({ hash });
      pushActivity(createActivity("wallet", `Approved ${pool.token.symbol}`, `Approved staking manager for ${pool.token.symbol}.`, "USDC", "completed", hash));
      return { hash };
    } finally {
      setStatus("idle");
    }
  }, [address, ensureArcNetwork, publicClient, pushActivity, walletClient]);

  const stake = useCallback(async (pool: StakingPoolView, amount: string) => {
    const managerAddress = STAKING_MANAGER_ADDRESS;
    if (!walletClient || !publicClient || !managerAddress) throw new Error("Connect wallet and configure staking manager.");
    await ensureArcNetwork();
    const value = parseUnits(amount || "0", pool.token.decimals);
    if (value <= BigInt(0)) throw new Error("Enter a valid staking amount.");
    setStatus("staking");
    try {
      const hash = await walletClient.writeContract({ address: managerAddress, abi: STAKING_MANAGER_ABI, functionName: "stake", args: [BigInt(pool.id), value], account: walletClient.account! });
      await publicClient.waitForTransactionReceipt({ hash });
      pushActivity(createActivity("wallet", `Staked ${pool.token.symbol}`, `Staked ${amount} ${pool.token.symbol} in Lunexis staking.`, "USDC", "completed", hash));
      await refresh();
      return { hash };
    } finally {
      setStatus("idle");
    }
  }, [ensureArcNetwork, publicClient, pushActivity, refresh, walletClient]);

  const unstake = useCallback(async (pool: StakingPoolView, amount: string) => {
    const managerAddress = STAKING_MANAGER_ADDRESS;
    if (!walletClient || !publicClient || !managerAddress) throw new Error("Connect wallet and configure staking manager.");
    await ensureArcNetwork();
    const value = parseUnits(amount || "0", pool.token.decimals);
    if (value <= BigInt(0)) throw new Error("Enter a valid unstake amount.");
    setStatus("unstaking");
    try {
      const hash = await walletClient.writeContract({ address: managerAddress, abi: STAKING_MANAGER_ABI, functionName: "unstake", args: [BigInt(pool.id), value], account: walletClient.account! });
      await publicClient.waitForTransactionReceipt({ hash });
      pushActivity(createActivity("wallet", `Unstaked ${pool.token.symbol}`, `Unstaked ${amount} ${pool.token.symbol}.`, "USDC", "completed", hash));
      await refresh();
      return { hash };
    } finally {
      setStatus("idle");
    }
  }, [ensureArcNetwork, publicClient, pushActivity, refresh, walletClient]);

  const claim = useCallback(async (pool: StakingPoolView) => {
    const managerAddress = STAKING_MANAGER_ADDRESS;
    if (!walletClient || !publicClient || !managerAddress) throw new Error("Connect wallet and configure staking manager.");
    await ensureArcNetwork();
    setStatus("claiming");
    try {
      const hash = await walletClient.writeContract({ address: managerAddress, abi: STAKING_MANAGER_ABI, functionName: "claim", args: [BigInt(pool.id)], account: walletClient.account! });
      await publicClient.waitForTransactionReceipt({ hash });
      pushActivity(createActivity("reward", `Claimed ${pool.rewardToken.symbol}`, `Claimed staking rewards from ${pool.token.symbol} pool.`, "USDC", "completed", hash));
      await refresh();
      return { hash };
    } finally {
      setStatus("idle");
    }
  }, [ensureArcNetwork, publicClient, pushActivity, refresh, walletClient]);

  const createPool = useCallback(async (input: CreatePoolInput) => {
    const managerAddress = STAKING_MANAGER_ADDRESS;
    if (!walletClient || !publicClient || !managerAddress) throw new Error("Connect admin wallet and configure staking manager.");
    if (!isAdmin) throw new Error("Only the staking admin can create pools.");
    await ensureArcNetwork();
    setStatus("creating");
    try {
      const aprBps = Math.round(Number(input.apr || 0) * 100);
      const lockDuration = Math.round(Number(input.lockDays || 0) * 86400);
      const hash = await walletClient.writeContract({
        address: managerAddress,
        abi: STAKING_MANAGER_ABI,
        functionName: "createPool",
        args: [input.stakeToken, input.rewardToken, aprBps, BigInt(lockDuration), poolTypeValue(input.poolType), input.metadata || "Lunexis ARC staking pool"],
        account: walletClient.account!,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      await refresh();
      return { hash };
    } finally {
      setStatus("idle");
    }
  }, [ensureArcNetwork, isAdmin, publicClient, refresh, walletClient]);

  return {
    addCustomToken,
    approve,
    claim,
    createPool,
    customTokens,
    ensureArcNetwork,
    error,
    isAdmin,
    isConnected,
    isSwitching,
    lastUpdated,
    managerAddress: STAKING_MANAGER_ADDRESS ?? zeroAddress,
    managerReady,
    pools,
    refresh,
    setError,
    stake,
    status,
    tokens,
    unstake,
    wrongNetwork,
  };
}
