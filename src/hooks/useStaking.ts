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
import { promptWalletNetworkSwitch } from "@/lib/wallet-network";

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

function parsePositiveAmount(amount: string, decimals: number, label: string) {
  try {
    const value = parseUnits(amount || "0", decimals);
    if (value <= BigInt(0)) throw new Error(`Enter a valid ${label} amount.`);
    return value;
  } catch (error: any) {
    if (error?.message?.startsWith("Enter a valid")) throw error;
    throw new Error(`Enter a valid ${label} amount.`);
  }
}

function normalizeStakingError(error: any) {
  const raw = String(error?.shortMessage || error?.message || error || "Transaction failed");
  if (/user rejected|rejected|denied|cancel/i.test(raw)) return "Wallet confirmation was cancelled. No funds were moved.";
  if (/insufficient|exceeds balance|funds|balance/i.test(raw)) return "Insufficient token balance or ARC Testnet gas for this transaction.";
  if (/network|chain|switch/i.test(raw)) return "Switch your wallet to ARC Testnet and try again.";
  if (/locked/i.test(raw)) return "This position is still locked. Wait until the unlock date before unstaking.";
  if (/paused/i.test(raw)) return "This staking pool is paused right now.";
  if (/allowance|approve/i.test(raw)) return "Approve this token for staking before submitting the stake transaction.";
  if (/transferfailed|transfer failed|reward/i.test(raw)) return "The staking manager could not transfer rewards. The reward vault may need funding.";
  if (/invalidamount|valid/i.test(raw)) return "Enter a valid amount for this staking action.";
  return raw;
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
  const [ownerAddress, setOwnerAddress] = useState<Address | undefined>();

  const managerReady = Boolean(STAKING_MANAGER_ADDRESS);
  const isConfiguredAdmin = Boolean(address && STAKING_ADMIN_WALLET && address.toLowerCase() === STAKING_ADMIN_WALLET);
  const isContractOwner = Boolean(address && ownerAddress && isAddressEqual(address, ownerAddress));
  const isAdmin = isConfiguredAdmin || isContractOwner;
  const canCreatePools = isContractOwner;
  const wrongNetwork = isConnected && chainId !== STAKING_CHAIN_ID;

  const ensureArcNetwork = useCallback(async () => {
    if (chainId === STAKING_CHAIN_ID) return;
    await promptWalletNetworkSwitch(STAKING_CHAIN_ID, switchChainAsync);
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

    const owner = await publicClient.readContract({ address: managerAddress, abi: STAKING_MANAGER_ABI, functionName: "owner" }).catch(() => undefined);
    setOwnerAddress(typeof owner === "string" && isAddress(owner) ? owner as Address : undefined);

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
      const allowance = address
        ? await publicClient.readContract({ address: stakeTokenAddress, abi: ERC20_ABI, functionName: "allowance", args: [address, managerAddress] }).catch(() => BigInt(0))
        : BigInt(0);
      const rewardVaultBalance = await publicClient.readContract({ address: rewardTokenAddress, abi: ERC20_ABI, functionName: "balanceOf", args: [managerAddress] }).catch(() => BigInt(0));

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
        allowance: allowance as bigint,
        rewardVaultBalance: cleanAmount(rewardVaultBalance as bigint, rewardToken.decimals),
        needsApproval: Boolean((allowance as bigint) === BigInt(0)),
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
    const value = parsePositiveAmount(amount, pool.token.decimals, "approval");
    const balance = parseUnits(pool.token.balance || "0", pool.token.decimals);
    if (value > balance) throw new Error(`Insufficient ${pool.token.symbol} balance for this approval.`);
    const nativeGas = await publicClient.getBalance({ address }).catch(() => BigInt(0));
    if (nativeGas <= BigInt(0)) throw new Error("Add native USDC gas on Arc Testnet before approving.");
    setStatus("approving");
    try {
      const allowance = await publicClient.readContract({ address: pool.token.address, abi: ERC20_ABI, functionName: "allowance", args: [address, managerAddress] });
      if ((allowance as bigint) >= value) {
        await refresh();
        return { hash: undefined };
      }
      const hash = await walletClient.writeContract({
        address: pool.token.address,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [managerAddress, maxUint256],
        account: address,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      pushActivity(createActivity("wallet", `Approved ${pool.token.symbol}`, `Approved staking manager for ${pool.token.symbol}.`, "USDC", "completed", hash));
      await refresh();
      return { hash };
    } catch (error) {
      throw new Error(normalizeStakingError(error));
    } finally {
      setStatus("idle");
    }
  }, [address, ensureArcNetwork, publicClient, pushActivity, refresh, walletClient]);

  const stake = useCallback(async (pool: StakingPoolView, amount: string) => {
    const managerAddress = STAKING_MANAGER_ADDRESS;
    if (!walletClient || !publicClient || !address || !managerAddress) throw new Error("Connect wallet and configure staking manager.");
    await ensureArcNetwork();
    if (pool.paused) throw new Error("This staking pool is paused right now.");
    const value = parsePositiveAmount(amount, pool.token.decimals, "staking");
    const balance = parseUnits(pool.token.balance || "0", pool.token.decimals);
    if (value > balance) throw new Error(`Insufficient ${pool.token.symbol} balance for this stake.`);
    const nativeGas = await publicClient.getBalance({ address }).catch(() => BigInt(0));
    if (nativeGas <= BigInt(0)) throw new Error("Add native USDC gas on Arc Testnet before staking.");
    const allowance = await publicClient.readContract({ address: pool.token.address, abi: ERC20_ABI, functionName: "allowance", args: [address, managerAddress] }).catch(() => BigInt(0));
    if ((allowance as bigint) < value) throw new Error(`Approve ${pool.token.symbol} before staking.`);
    setStatus("staking");
    try {
      const { request } = await publicClient.simulateContract({
        address: managerAddress,
        abi: STAKING_MANAGER_ABI,
        functionName: "stake",
        args: [BigInt(pool.id), value],
        account: address,
      });
      const hash = await walletClient.writeContract(request);
      await publicClient.waitForTransactionReceipt({ hash });
      pushActivity(createActivity("wallet", `Staked ${pool.token.symbol}`, `Staked ${amount} ${pool.token.symbol} in Lunexis staking.`, "USDC", "completed", hash));
      await refresh();
      return { hash };
    } catch (error) {
      throw new Error(normalizeStakingError(error));
    } finally {
      setStatus("idle");
    }
  }, [address, ensureArcNetwork, publicClient, pushActivity, refresh, walletClient]);

  const unstake = useCallback(async (pool: StakingPoolView, amount: string) => {
    const managerAddress = STAKING_MANAGER_ADDRESS;
    if (!walletClient || !publicClient || !address || !managerAddress) throw new Error("Connect wallet and configure staking manager.");
    await ensureArcNetwork();
    const value = parsePositiveAmount(amount, pool.token.decimals, "unstake");
    const staked = parseUnits(pool.userStaked || "0", pool.token.decimals);
    if (value > staked) throw new Error(`You only have ${pool.userStaked} ${pool.token.symbol} staked in this pool.`);
    if (pool.unlockAt && pool.unlockAt * 1000 > Date.now()) throw new Error(`This position is locked until ${new Date(pool.unlockAt * 1000).toLocaleString()}.`);
    setStatus("unstaking");
    try {
      const { request } = await publicClient.simulateContract({
        address: managerAddress,
        abi: STAKING_MANAGER_ABI,
        functionName: "unstake",
        args: [BigInt(pool.id), value],
        account: address,
      });
      const hash = await walletClient.writeContract(request);
      await publicClient.waitForTransactionReceipt({ hash });
      pushActivity(createActivity("wallet", `Unstaked ${pool.token.symbol}`, `Unstaked ${amount} ${pool.token.symbol}.`, "USDC", "completed", hash));
      await refresh();
      return { hash };
    } catch (error) {
      throw new Error(normalizeStakingError(error));
    } finally {
      setStatus("idle");
    }
  }, [address, ensureArcNetwork, publicClient, pushActivity, refresh, walletClient]);

  const claim = useCallback(async (pool: StakingPoolView) => {
    const managerAddress = STAKING_MANAGER_ADDRESS;
    if (!walletClient || !publicClient || !address || !managerAddress) throw new Error("Connect wallet and configure staking manager.");
    await ensureArcNetwork();
    const pending = parseUnits(pool.pendingReward || "0", pool.rewardToken.decimals);
    if (pending <= BigInt(0)) throw new Error("No staking rewards are ready to claim yet.");
    const vaultBalance = await publicClient.readContract({ address: pool.rewardToken.address, abi: ERC20_ABI, functionName: "balanceOf", args: [managerAddress] }).catch(() => BigInt(0));
    if ((vaultBalance as bigint) < pending) throw new Error("The staking manager reward vault needs more reward tokens before claims can succeed.");
    setStatus("claiming");
    try {
      const { request } = await publicClient.simulateContract({
        address: managerAddress,
        abi: STAKING_MANAGER_ABI,
        functionName: "claim",
        args: [BigInt(pool.id)],
        account: address,
      });
      const hash = await walletClient.writeContract(request);
      await publicClient.waitForTransactionReceipt({ hash });
      pushActivity(createActivity("reward", `Claimed ${pool.rewardToken.symbol}`, `Claimed staking rewards from ${pool.token.symbol} pool.`, "USDC", "completed", hash));
      await refresh();
      return { hash };
    } catch (error) {
      throw new Error(normalizeStakingError(error));
    } finally {
      setStatus("idle");
    }
  }, [address, ensureArcNetwork, publicClient, pushActivity, refresh, walletClient]);

  const createPool = useCallback(async (input: CreatePoolInput) => {
    const managerAddress = STAKING_MANAGER_ADDRESS;
    if (!walletClient || !publicClient || !address || !managerAddress) throw new Error("Connect admin wallet and configure staking manager.");
    if (!isContractOwner) throw new Error("Only the staking manager owner wallet can create pools.");
    await ensureArcNetwork();
    const managerCode = await publicClient.getCode({ address: managerAddress }).catch(() => undefined);
    if (!managerCode || managerCode === "0x") throw new Error("No staking manager contract was found at the configured address.");
    const nativeGas = await publicClient.getBalance({ address }).catch(() => BigInt(0));
    if (nativeGas <= BigInt(0)) throw new Error("Add native USDC gas on Arc Testnet before sending transactions.");
    setStatus("creating");
    try {
      const aprBps = Math.round(Number(input.apr || 0) * 100);
      const lockDuration = Math.round(Number(input.lockDays || 0) * 86400);
      const poolArgs = [input.stakeToken, input.rewardToken, aprBps, BigInt(lockDuration), poolTypeValue(input.poolType), input.metadata || "Lunexis ARC staking pool"] as const;
      const { request } = await publicClient.simulateContract({
        address: managerAddress,
        abi: STAKING_MANAGER_ABI,
        functionName: "createPool",
        args: poolArgs,
        account: walletClient.account!,
      });
      const hash = await walletClient.writeContract(request);
      await publicClient.waitForTransactionReceipt({ hash });
      await refresh();
      return { hash };
    } catch (error) {
      throw new Error(normalizeStakingError(error));
    } finally {
      setStatus("idle");
    }
  }, [address, ensureArcNetwork, isContractOwner, publicClient, refresh, walletClient]);

  return {
    addCustomToken,
    approve,
    claim,
    createPool,
    customTokens,
    ensureArcNetwork,
    error,
    isAdmin,
    canCreatePools,
    isConnected,
    isSwitching,
    lastUpdated,
    managerAddress: STAKING_MANAGER_ADDRESS ?? zeroAddress,
    managerReady,
    ownerAddress,
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
