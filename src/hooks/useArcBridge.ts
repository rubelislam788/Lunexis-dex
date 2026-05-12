// src/hooks/useArcBridge.ts
"use client";

import { useState, useCallback } from "react";
import { useWalletClient, usePublicClient } from "wagmi";
import type { BridgeState } from "@/types";

async function getArcKit() {
  const { AppKit } = await import("@circle-fin/app-kit");
  return new AppKit();
}

async function getViemAdapter(walletClient: any, publicClient: any) {
  const { ViemAdapter } = await import("@circle-fin/adapter-viem-v2");
  return new ViemAdapter(walletClient, { publicClient });
}

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

  /**
   * Execute a cross-chain bridge using Circle Arc App Kit (CCTP v2)
   * Docs: https://docs.arc.network/app-kit/quickstarts/bridge-tokens-across-blockchains
   */
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

      const kit = await getArcKit();
      const adapter = await getViemAdapter(walletClient, publicClient);

      updateState({ status: "bridging" });

      // Arc App Kit bridge call using Circle CCTP v2
      // https://docs.arc.network/app-kit/quickstarts/bridge-tokens-across-blockchains
      const result = await kit.bridge({
        from: {
          adapter,
          chain: state.fromChain as any,
        },
        to: {
          // If recipient differs from sender, provide adapter or just the address
          adapter,
          chain: state.toChain as any,
          ...(state.recipientAddress ? { recipientAddress: state.recipientAddress } : {}),
        },
        amount: state.amount,
        // token defaults to USDC when omitted
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
