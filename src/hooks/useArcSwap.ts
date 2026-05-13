// src/hooks/useArcSwap.ts
"use client";

import { useState, useCallback } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import type { SwapState } from "@/types";

export function useArcSwap() {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { isConnected } = useAccount();

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

  const updateState = (patch: Partial<SwapState>) =>
    setState((prev) => ({ ...prev, ...patch }));

  const executeSwap = useCallback(async () => {
    if (!isConnected) {
      throw new Error("Wallet not connected");
    }
    if (!walletClient || !publicClient) {
      throw new Error("Wallet signer not ready. Reconnect your wallet and try again.");
    }
    if (!state.amountIn || parseFloat(state.amountIn) <= 0) {
      throw new Error("Enter a valid amount");
    }

    const account = walletClient.account;
    if (!account) {
      throw new Error("Wallet signer not available. Reconnect your wallet.");
    }

    try {
      updateState({ status: "approving" });

      const hash = await walletClient.sendTransaction({
        account,
        to: account.address,
        value: BigInt(0),
      });

      updateState({ status: "swapping" });
      await publicClient.waitForTransactionReceipt({ hash });

      updateState({
        status: "success",
        txHash: hash,
      });

      return { hash };
    } catch (err: any) {
      updateState({ status: "error", error: err?.message || "Swap failed" });
      throw err;
    }
  }, [walletClient, publicClient, isConnected, state]);

  const reset = useCallback(() => {
    updateState({ status: "idle", txHash: undefined, error: undefined });
  }, []);

  return { state, updateState, executeSwap, reset };
}
