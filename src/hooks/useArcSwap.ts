// src/hooks/useArcSwap.ts
"use client";

import { useState, useCallback } from "react";
import { useWalletClient, usePublicClient } from "wagmi";
import type { SwapState } from "@/types";

// Dynamically import Arc App Kit to avoid SSR issues
async function getArcKit() {
  const { AppKit } = await import("@circle-fin/app-kit");
  return new AppKit();
}

async function getViemAdapter(walletClient: any, publicClient: any) {
  const { ViemAdapter } = await import("@circle-fin/adapter-viem-v2");
  return new ViemAdapter(walletClient, { publicClient });
}

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

  /**
   * Execute a swap using Circle Arc App Kit
   * Docs: https://docs.arc.network/app-kit/quickstarts/swap-tokens-same-chain
   */
  const executeSwap = useCallback(async () => {
    if (!walletClient || !publicClient) {
      throw new Error("Wallet not connected");
    }
    if (!state.amountIn || parseFloat(state.amountIn) <= 0) {
      throw new Error("Enter a valid amount");
    }

    const kitKey = process.env.NEXT_PUBLIC_ARC_KIT_KEY;
    if (!kitKey) {
      throw new Error("ARC_KIT_KEY not configured. Add it to .env.local");
    }

    try {
      updateState({ status: "approving" });

      const kit = await getArcKit();
      const adapter = await getViemAdapter(walletClient, publicClient);

      updateState({ status: "swapping" });

      // Arc App Kit swap call
      // https://docs.arc.network/app-kit/quickstarts/swap-tokens-same-chain
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
