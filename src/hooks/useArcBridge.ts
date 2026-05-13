"use client";

import { useCallback, useEffect, useState } from "react";
import { erc20Abi, isAddress, isAddressEqual, maxUint256, parseUnits, zeroAddress, type Address } from "viem";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import type { BridgeState, TokenSymbol } from "@/types";
import { DEX_CONTRACTS, BRIDGE_ABI } from "@/lib/arc-dex";
import { getAppKit, getBrowserViemAdapter } from "@/lib/arc-kit";
import { BRIDGE_TOKENS, TOKEN_CONTRACTS, TOKEN_DECIMALS } from "@/lib/tokens";

const ARC_CHAIN_ID = 1723;
const SEPOLIA_CHAIN_ID = 11155111;

function parseTokenAmount(value: string, decimals: number) {
  if (!value.trim()) return BigInt(0);
  try {
    return parseUnits(value, decimals);
  } catch {
    return null;
  }
}

export function useArcBridge() {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { address, chainId, isConnected } = useAccount();

  const [state, setState] = useState<BridgeState>({
    fromChain: "Ethereum_Sepolia",
    toChain: "Arc_Testnet",
    token: BRIDGE_TOKENS[0],
    amount: "",
    recipientAddress: "",
    status: "idle",
  });
  const [allowance, setAllowance] = useState<bigint>(BigInt(0));

  const updateState = useCallback((patch: Partial<BridgeState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  const token = state.token as TokenSymbol;
  const bridge = DEX_CONTRACTS.bridge;
  const currentChainId = chainId ?? publicClient?.chain?.id ?? SEPOLIA_CHAIN_ID;
  const tokenAddress = TOKEN_CONTRACTS[token]?.[currentChainId];
  const amount = parseTokenAmount(state.amount, TOKEN_DECIMALS[token]);
  const canUseAppKitBridge = currentChainId === SEPOLIA_CHAIN_ID && token === "USDC";

  useEffect(() => {
    let cancelled = false;

    const syncAllowance = async () => {
      if (!publicClient || !address || !bridge || !tokenAddress || currentChainId !== SEPOLIA_CHAIN_ID) {
        if (!cancelled) setAllowance(BigInt(0));
        return;
      }

      try {
        const next = await publicClient.readContract({
          address: tokenAddress,
          abi: erc20Abi,
          functionName: "allowance",
          args: [address, bridge],
        });
        if (!cancelled) setAllowance(next as bigint);
      } catch {
        if (!cancelled) setAllowance(BigInt(0));
      }
    };

    syncAllowance();
    return () => {
      cancelled = true;
    };
  }, [address, bridge, currentChainId, publicClient, tokenAddress]);

  const needsApproval = Boolean(
    bridge &&
    tokenAddress &&
    amount &&
    amount > BigInt(0) &&
    allowance < amount &&
    !isAddressEqual(tokenAddress, zeroAddress) &&
    !canUseAppKitBridge
  );

  const approve = useCallback(async () => {
    if (!isConnected || !address) throw new Error("Wallet not connected");
    if (currentChainId !== SEPOLIA_CHAIN_ID) throw new Error("Switch your wallet to Ethereum Sepolia to approve bridge assets.");
    if (!walletClient || !publicClient) throw new Error("Wallet signer not ready. Reconnect your wallet and try again.");
    if (!bridge || !tokenAddress || isAddressEqual(tokenAddress, zeroAddress)) {
      throw new Error("Bridge contract or source token address is not configured.");
    }
    const account = walletClient.account;
    if (!account) throw new Error("Wallet signer account is not available.");

    try {
      updateState({ status: "approving", error: undefined });
      const hash = await walletClient.writeContract({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: "approve",
        args: [bridge, maxUint256],
        account,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      setAllowance(maxUint256);
      updateState({ status: "idle", txHash: hash });
      return { hash };
    } catch (err: any) {
      updateState({ status: "error", error: err?.message || "Approval failed" });
      throw err;
    }
  }, [address, bridge, currentChainId, isConnected, publicClient, tokenAddress, updateState, walletClient]);

  const executeBridge = useCallback(async () => {
    if (!isConnected || !address) throw new Error("Wallet not connected");
    if (currentChainId !== SEPOLIA_CHAIN_ID) throw new Error("Switch your wallet to Ethereum Sepolia to bridge into ARC Chain.");
    if (!walletClient || !publicClient) throw new Error("Wallet signer not ready. Reconnect your wallet and try again.");
    if (!state.amount || parseFloat(state.amount) <= 0 || !amount) throw new Error("Enter a valid amount");
    const recipient = state.recipientAddress.trim();
    if (recipient && !isAddress(recipient)) throw new Error("Enter a valid recipient wallet address.");
    const toAddress = (recipient ? recipient : address) as Address;

    try {
      updateState({ status: "bridging", error: undefined });
      if (!bridge || !tokenAddress || isAddressEqual(tokenAddress, zeroAddress)) {
        if (!canUseAppKitBridge) throw new Error("Bridge contract or token address is not configured.");
        if (state.fromChain === state.toChain) throw new Error("Source and destination chains must differ");

        const adapter = await getBrowserViemAdapter();
        const kit = await getAppKit();
        const result = await kit.bridge({
          from: { adapter, chain: "Ethereum_Sepolia" },
          to: { adapter, chain: "Arc_Testnet" },
          amount: state.amount,
        });
        const hash =
          result?.steps?.find?.((step: any) => step?.hash)?.hash ??
          result?.steps?.find?.((step: any) => step?.txHash)?.txHash ??
          result?.hash;

        if (!hash) {
          throw new Error("Bridge submitted but no transaction hash was returned.");
        }

        updateState({ status: "success", txHash: hash });
        return { hash };
      }

      if (needsApproval) throw new Error(`Approve ${token} before bridging.`);
      if (state.fromChain === state.toChain) throw new Error("Source and destination chains must differ");
      const account = walletClient.account;
      if (!account) throw new Error("Wallet signer account is not available.");

      const hash = await walletClient.writeContract({
        address: bridge,
        abi: BRIDGE_ABI,
        functionName: "bridgeToken",
        args: [tokenAddress, amount, BigInt(ARC_CHAIN_ID), toAddress],
        account,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      updateState({ status: "success", txHash: hash });
      return { hash };
    } catch (err: any) {
      updateState({ status: "error", error: err?.message || "Bridge failed" });
      throw err;
    }
  }, [address, amount, bridge, currentChainId, isConnected, needsApproval, publicClient, state.amount, state.fromChain, state.recipientAddress, state.toChain, token, tokenAddress, updateState, walletClient]);

  const reset = useCallback(() => {
    updateState({ status: "idle", txHash: undefined, error: undefined });
  }, [updateState]);

  return {
    state,
    updateState,
    executeBridge,
    approve,
    needsApproval,
    bridgeConfigured: Boolean(bridge) || canUseAppKitBridge,
    currentChainId,
    reset,
  };
}
