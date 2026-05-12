// src/hooks/useArcBridge.ts
"use client";

import { useState, useCallback } from "react";
import { useWalletClient, usePublicClient } from "wagmi";
import type { BridgeState } from "@/types";
import { getAppKit, getViemAdapter } from "@/lib/arc-kit";

export function useArcBridge() {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [state, setState] = useState<BridgeState>({
    fromChain: "Ethereum_Sepolia",
    toChain: "Arc_Testnet",
    token: "USDC",
    amount: "",
    recipientAddress: "",
    status: "idle",
  });

  const updateState = (patch: Partial<BridgeState>) =>
    setState((prev) => ({ ...prev, ...patch }));

  const executeBridge = useCallback(async () => {
    if (!walletClient || !publicClient) {
      throw new Error("Wallet not connected");
    }
    if (!state.amount || parseFloat(state.amount) <= 0) {
      throw new Error("Enter a valid amount");
    }
    if (state.fromChain === state.toChain) {
      throw new Error("Source and destination chains must differ");
    }

    try {
      updateState({ status: "approving" });

      const kit = await getAppKit();
      const adapter = await getViemAdapter(walletClient, publicClient);

      updateState({ status: "bridging" });

      const result = await kit.bridge({
        from: {
          adapter,
          chain: state.fromChain as any,
        },
        to: {
          adapter,
          chain: state.toChain as any,
          ...(state.recipientAddress ? { recipientAddress: state.recipientAddress } : {}),
        },
        amount: state.amount,
      });

      updateState({
        status: "success",
        txHash: (result as any)?.txHash || (result as any)?.hash,
      });

      return result;
    } catch (err: any) {
      updateState({ status: "error", error: err?.message || "Bridge failed" });
      throw err;
    }
  }, [walletClient, publicClient, state]);

  const reset = useCallback(() => {
    updateState({ status: "idle", txHash: undefined, error: undefined });
  }, []);

  return { state, updateState, executeBridge, reset };
}
