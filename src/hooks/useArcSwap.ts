"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { erc20Abi, formatEther, formatUnits, isAddressEqual, maxUint256, parseUnits, zeroAddress, type Address } from "viem";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import type { SwapState, TokenSymbol } from "@/types";
import { DEX_CONTRACTS, SWAP_ROUTER_ABI } from "@/lib/arc-dex";
import { ARC_TESTNET_CHAIN_ID, getAppKit, getAppKitResultHash, getArcKitKey, getBrowserViemAdapter } from "@/lib/arc-kit";
import { TOKEN_CONTRACTS, TOKEN_DECIMALS } from "@/lib/tokens";

const ARC_CHAIN_ID = ARC_TESTNET_CHAIN_ID;

function parseTokenAmount(value: string, decimals: number) {
  if (!value.trim()) return BigInt(0);
  try {
    return parseUnits(value, decimals);
  } catch {
    return null;
  }
}

function parseSlippage(slippage: string) {
  if (slippage === "auto") return 0.5;
  return Number(slippage.replace("%", "")) || 0.5;
}

function cleanAmount(raw: bigint, decimals: number) {
  const formatted = formatUnits(raw, decimals);
  const [whole, fraction = ""] = formatted.split(".");
  const trimmedFraction = fraction.slice(0, decimals === 6 ? 4 : 6).replace(/0+$/, "");
  return trimmedFraction ? `${whole}.${trimmedFraction}` : whole;
}

export function useArcSwap() {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { address, chainId, isConnected } = useAccount();

  const [state, setState] = useState<SwapState>({
    fromToken: "USDC",
    toToken: "EURC",
    fromChain: "Arc_Testnet",
    toChain: "Arc_Testnet",
    amountIn: "",
    amountOut: "",
    slippage: "auto",
    status: "idle",
  });
  const [allowance, setAllowance] = useState<bigint>(BigInt(0));
  const [quoteLoading, setQuoteLoading] = useState(false);

  const updateState = useCallback((patch: Partial<SwapState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  const fromToken = state.fromToken as TokenSymbol;
  const toToken = state.toToken as TokenSymbol;
  const router = DEX_CONTRACTS.swapRouter;
  const currentChainId = chainId ?? publicClient?.chain?.id ?? ARC_CHAIN_ID;
  const fromTokenAddress = TOKEN_CONTRACTS[fromToken]?.[ARC_CHAIN_ID];
  const toTokenAddress = TOKEN_CONTRACTS[toToken]?.[ARC_CHAIN_ID];
  const amountIn = parseTokenAmount(state.amountIn, TOKEN_DECIMALS[fromToken]);
  const canUseAppKitSwap = (fromToken === "USDC" && toToken === "EURC") || (fromToken === "EURC" && toToken === "USDC");
  const appKitKey = getArcKitKey();
  const appKitReady = Boolean(appKitKey);
  const routerReady = Boolean(
    router &&
    fromTokenAddress &&
    toTokenAddress &&
    !isAddressEqual(fromTokenAddress, zeroAddress) &&
    !isAddressEqual(toTokenAddress, zeroAddress)
  );
  const routeMode: "router" | "appkit" | "appkit-missing-key" | "unavailable" = routerReady
    ? "router"
    : canUseAppKitSwap
      ? appKitReady
        ? "appkit"
        : "appkit-missing-key"
      : "unavailable";

  const estimatedOut = useMemo(() => state.amountOut, [state.amountOut]);

  useEffect(() => {
    let cancelled = false;

    const syncQuote = async () => {
      if (!state.amountIn || !amountIn || fromToken === toToken) {
        if (!cancelled) {
          setQuoteLoading(false);
          setState((prev) => ({ ...prev, amountOut: "" }));
        }
        return;
      }

      if (routeMode !== "router" || !router || !publicClient || currentChainId !== ARC_CHAIN_ID || !fromTokenAddress || !toTokenAddress) {
        if (!cancelled) {
          setQuoteLoading(false);
          setState((prev) => ({ ...prev, amountOut: "" }));
        }
        return;
      }

      try {
        if (!cancelled) setQuoteLoading(true);
        const { result } = await publicClient.simulateContract({
          address: router,
          abi: SWAP_ROUTER_ABI,
          functionName: "swapExactInput",
          args: [fromTokenAddress as Address, toTokenAddress as Address, amountIn, BigInt(0), (address ?? zeroAddress) as Address],
          account: (address ?? zeroAddress) as Address,
        });

        if (!cancelled) {
          setState((prev) => ({ ...prev, amountOut: cleanAmount(result as bigint, TOKEN_DECIMALS[toToken]) }));
        }
      } catch {
        if (!cancelled) {
          setState((prev) => ({ ...prev, amountOut: "" }));
        }
      } finally {
        if (!cancelled) setQuoteLoading(false);
      }
    };

    syncQuote();
    return () => {
      cancelled = true;
    };
  }, [address, amountIn, currentChainId, fromToken, fromTokenAddress, publicClient, routeMode, router, state.amountIn, toToken, toTokenAddress]);

  useEffect(() => {
    let cancelled = false;

    const syncAllowance = async () => {
      if (!publicClient || !address || !router || !fromTokenAddress || currentChainId !== ARC_CHAIN_ID) {
        if (!cancelled) setAllowance(BigInt(0));
        return;
      }

      try {
        const next = await publicClient.readContract({
          address: fromTokenAddress,
          abi: erc20Abi,
          functionName: "allowance",
          args: [address, router],
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
  }, [address, currentChainId, fromTokenAddress, publicClient, router]);

  const needsApproval = Boolean(
    router &&
    fromTokenAddress &&
    amountIn &&
    amountIn > BigInt(0) &&
    allowance < amountIn &&
    !isAddressEqual(fromTokenAddress, zeroAddress) &&
    routeMode === "router"
  );

  const approve = useCallback(async () => {
    if (!isConnected || !address) throw new Error("Wallet not connected");
    if (currentChainId !== ARC_CHAIN_ID) throw new Error("Switch your wallet to ARC Chain to approve swap tokens.");
    if (!walletClient || !publicClient) throw new Error("Wallet signer not ready. Reconnect your wallet and try again.");
    if (!router || !fromTokenAddress || isAddressEqual(fromTokenAddress, zeroAddress)) {
      throw new Error("Swap router or token address is not configured.");
    }
    const account = walletClient.account;
    if (!account) throw new Error("Wallet signer account is not available.");

    try {
      updateState({ status: "approving", error: undefined });
      const { request } = await publicClient.simulateContract({
        address: fromTokenAddress,
        abi: erc20Abi,
        functionName: "approve",
        args: [router, maxUint256],
        account,
      });
      const hash = await walletClient.writeContract(request);
      await publicClient.waitForTransactionReceipt({ hash });
      setAllowance(maxUint256);
      updateState({ status: "idle", txHash: hash });
      return { hash };
    } catch (err: any) {
      updateState({ status: "error", error: err?.message || "Approval failed" });
      throw err;
    }
  }, [address, currentChainId, fromTokenAddress, isConnected, publicClient, router, updateState, walletClient]);

  const executeSwap = useCallback(async () => {
    if (!isConnected || !address) throw new Error("Wallet not connected");
    if (currentChainId !== ARC_CHAIN_ID) throw new Error("Switch your wallet to ARC Chain to execute swaps.");
    if (!walletClient || !publicClient) throw new Error("Wallet signer not ready. Reconnect your wallet and try again.");
    if (!state.amountIn || parseFloat(state.amountIn) <= 0 || !amountIn) throw new Error("Enter a valid amount");
    if (fromToken === toToken) throw new Error("Choose two different tokens to swap.");
    try {
      updateState({ status: "swapping", error: undefined });

      if (!router || !fromTokenAddress || !toTokenAddress || isAddressEqual(fromTokenAddress, zeroAddress) || isAddressEqual(toTokenAddress, zeroAddress)) {
        if (!canUseAppKitSwap) {
          throw new Error("Swap router or token addresses are not configured.");
        }

        if (!appKitKey) {
          throw new Error("Set NEXT_PUBLIC_ARC_KIT_KEY to enable App Kit swap fallback for USDC and EURC.");
        }

        const adapter = await getBrowserViemAdapter();
        const kit = await getAppKit();
        const result = await kit.swap({
          from: { adapter, chain: "Arc_Testnet" },
          tokenIn: fromToken,
          tokenOut: toToken,
          amountIn: state.amountIn,
          config: { kitKey: appKitKey },
        });

        const hash = getAppKitResultHash(result);

        if (!hash) {
          throw new Error("Swap submitted but no transaction hash was returned.");
        }

        updateState({ status: "success", txHash: hash });
        return { hash, amountOut: estimatedOut };
      }

      if (needsApproval) throw new Error(`Approve ${fromToken} before swapping.`);
      const account = walletClient.account;
      if (!account) throw new Error("Wallet signer account is not available.");

      const quotedOut = Number(estimatedOut || "0");
      const minOut = quotedOut > 0
        ? parseUnits(
            Math.max(0, quotedOut * (1 - parseSlippage(state.slippage) / 100)).toFixed(TOKEN_DECIMALS[toToken] === 6 ? 4 : 6),
            TOKEN_DECIMALS[toToken]
          )
        : BigInt(0);

      const { request } = await publicClient.simulateContract({
        address: router,
        abi: SWAP_ROUTER_ABI,
        functionName: "swapExactInput",
        args: [fromTokenAddress as Address, toTokenAddress as Address, amountIn, minOut, address],
        account,
      });
      const hash = await walletClient.writeContract(request);

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      updateState({ status: "success", txHash: hash });
      const gasFee = receipt.effectiveGasPrice ? formatEther(receipt.effectiveGasPrice * receipt.gasUsed) : undefined;
      return { hash, amountOut: estimatedOut, gasFee };
    } catch (err: any) {
      updateState({ status: "error", error: err?.message || "Swap failed" });
      throw err;
    }
  }, [address, amountIn, appKitKey, currentChainId, estimatedOut, fromToken, fromTokenAddress, isConnected, needsApproval, publicClient, router, state.amountIn, state.slippage, toToken, toTokenAddress, updateState, walletClient]);

  const reset = useCallback(() => {
    updateState({ status: "idle", txHash: undefined, error: undefined });
  }, [updateState]);

  return {
    state,
    updateState,
    executeSwap,
    approve,
    needsApproval,
    routerConfigured: routerReady,
    appKitSupported: canUseAppKitSwap,
    appKitReady,
    swapReady: routeMode === "router" || routeMode === "appkit",
    routeMode,
    requiredChainId: ARC_CHAIN_ID,
    currentChainId,
    estimatedOut,
    quoteLoading,
    reset,
  };
}
