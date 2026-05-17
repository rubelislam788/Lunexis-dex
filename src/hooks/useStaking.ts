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
  if (/allowance|approve|transferfrom/i.test(raw)) return "Approve this token for staking before submitting the stake transaction.";
  if (/transferfailed|transfer failed|reward/i.test(raw)) return "The staking contract could not transfer rewards. The reward vault may need funding.";
  if (/invalidamount|valid|zero/i.test(raw)) return "Enter a valid amount for this staking action.";
  if (/function.*not found|selector|revert/i.test(raw)) return "The staking contract rejected this action. Check that this token is allowed on the new staking contract.";
  return raw;
}

function isBigIntLike(value: unknown): value is bigint {
  return typeof value === "bigint";
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
  const isConfiguredAdmin = Boolean(address && STAKING_ADMIN_WALLET && address.toLowerCase() === STAKING_ADMIN_WALLET);
  const wrongNetwork = isConnected && chainId !== STAKING_CHAIN_ID;

  const ensureArcNetwork = useCallback(async () => {
    if (chainId === STAKING_CHAIN_ID) return;
    await promptWalletNetworkSwitch(STAKING_CHAIN_ID, switchChainAsync);
  }, [chainId, switchChainAsync]);

  const readTokenInfo = useCallback(async (tokenAddress: string): Promise<StakingToken> => {
    if (!publicClient || !isAddress(tokenAddress)) throw new Error("Paste a valid ARC Testnet ERC20 contract address.");
    const token = tokenAddress as Address;
    const known = DEFAULT_STAKING_TOKENS.find((item) => isAddressEqual(item.address, token));
    if (known) {
      const rawBalance = address
        ? await publicClient.readContract({ address: token, abi: ERC20_ABI, functionName: "balanceOf", args: [address] }).catch(() => BigInt(0))
        : BigInt(0);
      return { ...known, balance: cleanAmount(rawBalance as bigint, known.decimals) };
    }

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

  const readAllowedTokens = useCallback(async () => {
    if (!publicClient || !STAKING_MANAGER_ADDRESS) return [];
    const result = await publicClient.readContract({
      address: STAKING_MANAGER_ADDRESS,
      abi: STAKING_MANAGER_ABI,
      functionName: "getAllowedTokens",
    } as any);
    return Array.isArray(result) ? result.filter((item): item is Address => typeof item === "string" && isAddress(item)) : [];
  }, [publicClient]);

  const readMaxBigInt = useCallback(async (functionName: "pendingRewards" | "getStakedBalance", argsList: readonly unknown[][]) => {
    if (!publicClient || !STAKING_MANAGER_ADDRESS) return BigInt(0);
    const values: bigint[] = [];
    for (const args of argsList) {
      try {
        const result = await publicClient.readContract({
          address: STAKING_MANAGER_ADDRESS,
          abi: STAKING_MANAGER_ABI,
          functionName,
          args,
        } as any);
        if (isBigIntLike(result)) values.push(result);
      } catch {
        // Try the next supported signature.
      }
    }
    return values.reduce((max, value) => value > max ? value : max, BigInt(0));
  }, [publicClient]);

  const refresh = useCallback(async () => {
    if (!publicClient) return;
    const savedCustom = loadCustomTokens();
    setCustomTokens(savedCustom);

    const managerCode = STAKING_MANAGER_ADDRESS
      ? await publicClient.getCode({ address: STAKING_MANAGER_ADDRESS }).catch(() => undefined)
      : undefined;
    if (!STAKING_MANAGER_ADDRESS || !managerCode || managerCode === "0x") {
      setError("No staking contract was found on ARC Testnet at the configured address.");
      setPools([]);
      return;
    }

    try {
      const allowedAddresses = await readAllowedTokens();
      const allKnownTokens = [...DEFAULT_STAKING_TOKENS, ...savedCustom];
      const allowedSet = new Set(allowedAddresses.map((item) => item.toLowerCase()));
      const allowedTokenInputs = allowedAddresses.length > 0
        ? allowedAddresses
        : allKnownTokens.map((token) => token.address).filter((token) => allowedSet.has(token.toLowerCase()));

      const tokenViews = await Promise.all(allowedTokenInputs.map((token) => readTokenInfo(token)));
      setTokens(tokenViews);

      const nextPools = await Promise.all(tokenViews.map(async (token, id) => {
        const [allowance, staked, pending, rewardVaultBalance] = await Promise.all([
          address
            ? publicClient.readContract({ address: token.address, abi: ERC20_ABI, functionName: "allowance", args: [address, STAKING_MANAGER_ADDRESS] }).catch(() => BigInt(0))
            : Promise.resolve(BigInt(0)),
          address
            ? readMaxBigInt("getStakedBalance", [[address, token.address], [token.address, address], [token.address], []])
            : Promise.resolve(BigInt(0)),
          address
            ? readMaxBigInt("pendingRewards", [[address, token.address], [token.address, address], [token.address], []])
            : Promise.resolve(BigInt(0)),
          publicClient.readContract({ address: token.address, abi: ERC20_ABI, functionName: "balanceOf", args: [STAKING_MANAGER_ADDRESS] }).catch(() => BigInt(0)),
        ]);

        return {
          id,
          token,
          rewardToken: token,
          aprBps: 0,
          lockDuration: 0,
          poolType: "Flexible",
          paused: false,
          totalStaked: cleanAmount(rewardVaultBalance as bigint, token.decimals),
          metadata: `Lunexis ${token.symbol} ARC Testnet staking`,
          userStaked: cleanAmount(staked as bigint, token.decimals),
          pendingReward: cleanAmount(pending as bigint, token.decimals),
          unlockAt: 0,
          allowance: allowance as bigint,
          rewardVaultBalance: cleanAmount(rewardVaultBalance as bigint, token.decimals),
          needsApproval: Boolean((allowance as bigint) === BigInt(0)),
        } satisfies StakingPoolView;
      }));

      setError("");
      setPools(nextPools);
      setLastUpdated(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    } catch (error: any) {
      setError(normalizeStakingError(error));
      setPools([]);
    }
  }, [address, publicClient, readAllowedTokens, readMaxBigInt, readTokenInfo]);

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, 8000);
    window.addEventListener("online", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("online", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [refresh]);

  const sendStakingWrite = useCallback(async (functionName: "stake" | "unstake" | "claimRewards", argsList: readonly unknown[][]) => {
    if (!walletClient || !publicClient || !address || !STAKING_MANAGER_ADDRESS) throw new Error("Connect wallet and configure staking contract.");
    let lastError: unknown;
    for (const args of argsList) {
      try {
        const { request } = await publicClient.simulateContract({
          address: STAKING_MANAGER_ADDRESS,
          abi: STAKING_MANAGER_ABI,
          functionName,
          args,
          account: address,
        } as any);
        const hash = await walletClient.writeContract(request);
        await publicClient.waitForTransactionReceipt({ hash });
        await refresh();
        return { hash };
      } catch (error) {
        lastError = error;
      }
    }
    throw new Error(normalizeStakingError(lastError));
  }, [address, publicClient, refresh, walletClient]);

  const approve = useCallback(async (pool: StakingPoolView, amount: string) => {
    if (!walletClient || !publicClient || !address || !STAKING_MANAGER_ADDRESS) throw new Error("Connect wallet and configure staking contract.");
    await ensureArcNetwork();
    const value = parsePositiveAmount(amount, pool.token.decimals, "approval");
    const balance = parseUnits(pool.token.balance || "0", pool.token.decimals);
    if (value > balance) throw new Error(`Insufficient ${pool.token.symbol} balance for this approval.`);
    const nativeGas = await publicClient.getBalance({ address }).catch(() => BigInt(0));
    if (nativeGas <= BigInt(0)) throw new Error("Add native USDC gas on ARC Testnet before approving.");
    setStatus("approving");
    try {
      const allowance = await publicClient.readContract({ address: pool.token.address, abi: ERC20_ABI, functionName: "allowance", args: [address, STAKING_MANAGER_ADDRESS] });
      if ((allowance as bigint) >= value) {
        await refresh();
        return { hash: undefined };
      }
      const hash = await walletClient.writeContract({
        address: pool.token.address,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [STAKING_MANAGER_ADDRESS, maxUint256],
        account: address,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      pushActivity(createActivity("wallet", `Approved ${pool.token.symbol}`, `Approved staking contract for ${pool.token.symbol}.`, pool.token.symbol, "completed", hash));
      await refresh();
      return { hash };
    } catch (error) {
      throw new Error(normalizeStakingError(error));
    } finally {
      setStatus("idle");
    }
  }, [address, ensureArcNetwork, publicClient, pushActivity, refresh, walletClient]);

  const stake = useCallback(async (pool: StakingPoolView, amount: string) => {
    if (!address) throw new Error("Connect wallet and configure staking contract.");
    if (!publicClient || !STAKING_MANAGER_ADDRESS) throw new Error("Connect wallet and configure staking contract.");
    await ensureArcNetwork();
    const value = parsePositiveAmount(amount, pool.token.decimals, "staking");
    const balance = parseUnits(pool.token.balance || "0", pool.token.decimals);
    if (value > balance) throw new Error(`Insufficient ${pool.token.symbol} balance for this stake.`);
    const nativeGas = publicClient ? await publicClient.getBalance({ address }).catch(() => BigInt(0)) : BigInt(0);
    if (nativeGas <= BigInt(0)) throw new Error("Add native USDC gas on ARC Testnet before staking.");
    const allowance = await publicClient.readContract({ address: pool.token.address, abi: ERC20_ABI, functionName: "allowance", args: [address, STAKING_MANAGER_ADDRESS] }).catch(() => BigInt(0));
    if ((allowance as bigint) < value) throw new Error(`Approve ${pool.token.symbol} before staking.`);
    setStatus("staking");
    try {
      const result = await sendStakingWrite("stake", [[pool.token.address, value], [value, pool.token.address], [value]]);
      pushActivity(createActivity("wallet", `Staked ${pool.token.symbol}`, `Staked ${amount} ${pool.token.symbol} in Lunexis staking.`, pool.token.symbol, "completed", result.hash));
      return result;
    } finally {
      setStatus("idle");
    }
  }, [address, ensureArcNetwork, publicClient, pushActivity, sendStakingWrite]);

  const unstake = useCallback(async (pool: StakingPoolView, amount: string) => {
    await ensureArcNetwork();
    const value = parsePositiveAmount(amount, pool.token.decimals, "unstake");
    const staked = parseUnits(pool.userStaked || "0", pool.token.decimals);
    if (value > staked) throw new Error(`You only have ${pool.userStaked} ${pool.token.symbol} staked.`);
    setStatus("unstaking");
    try {
      const result = await sendStakingWrite("unstake", [[pool.token.address, value], [value, pool.token.address], [value]]);
      pushActivity(createActivity("wallet", `Unstaked ${pool.token.symbol}`, `Unstaked ${amount} ${pool.token.symbol}.`, pool.token.symbol, "completed", result.hash));
      return result;
    } finally {
      setStatus("idle");
    }
  }, [ensureArcNetwork, pushActivity, sendStakingWrite]);

  const claim = useCallback(async (pool: StakingPoolView) => {
    await ensureArcNetwork();
    const pending = parseUnits(pool.pendingReward || "0", pool.rewardToken.decimals);
    if (pending <= BigInt(0)) throw new Error("No staking rewards are ready to claim yet.");
    setStatus("claiming");
    try {
      const result = await sendStakingWrite("claimRewards", [[pool.token.address], []]);
      pushActivity(createActivity("reward", `Claimed ${pool.rewardToken.symbol}`, `Claimed staking rewards from ${pool.token.symbol} staking.`, pool.rewardToken.symbol, "completed", result.hash));
      return result;
    } finally {
      setStatus("idle");
    }
  }, [ensureArcNetwork, pushActivity, sendStakingWrite]);

  const createPool = useCallback(async (_input: CreatePoolInput) => {
    throw new Error("The new staking contract manages allowed tokens onchain. Pool creation is not available in this frontend.");
  }, []);

  return {
    addCustomToken,
    approve,
    claim,
    createPool,
    customTokens,
    ensureArcNetwork,
    error,
    isAdmin: isConfiguredAdmin,
    canCreatePools: false,
    isConnected,
    isSwitching,
    lastUpdated,
    managerAddress: STAKING_MANAGER_ADDRESS ?? zeroAddress,
    managerReady,
    ownerAddress: undefined,
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
