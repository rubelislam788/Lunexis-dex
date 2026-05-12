// src/hooks/useArcSwap.ts
"use client";

import { useState, useCallback } from "react";
import { useWalletClient, usePublicClient } from "wagmi";
import type { SwapState } from "@/types";
import { getAppKit, getViemAdapter, getArcKitKey } from "@/lib/arc-kit";

export function useArcSwap() {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

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
    if (!walletClient || !publicClient) {
      throw new Error("Wallet not connected");
    }
    if (!state.amountIn || parseFloat(state.amountIn) <= 0) {
      throw new Error("Enter a valid amount");
    }

    const kitKey = getArcKitKey();
    if (!kitKey) {
      throw new Error("ARC_KIT_KEY not configured. Add it to .env.local");
    }

    try {
      updateState({ status: "approving" });

      const kit = await getAppKit();
      const adapter = await getViemAdapter(walletClient, publicClient);

      updateState({ status: "swapping" });

      const result = await kit.swap({
        from: {
          adapter,
          chain: state.fromChain as any,
        },
        tokenIn: state.fromToken as any,
        tokenOut: state.toToken as any,
        amountIn: state.amountIn,
        config: {
          kitKey,
        },
      });

      updateState({
        status: "success",
        txHash: (result as any)?.txHash || (result as any)?.hash,
      });

      return result;
    } catch (err: any) {
      updateState({ status: "error", error: err?.message || "Swap failed" });
      throw err;
    }
  }, [walletClient, publicClient, state]);

  const reset = useCallback(() => {
    updateState({ status: "idle", txHash: undefined, error: undefined });
  }, []);

  return { state, updateState, executeSwap, reset };
}
