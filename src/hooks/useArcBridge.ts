// src/hooks/useArcBridge.ts
"use client";

import { useState, useCallback } from "react";
import { useAccount, useWalletClient, usePublicClient } from "wagmi";
import type { BridgeState } from "@/types";

export function useArcBridge() {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { isConnected } = useAccount();

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
    if (!isConnected) {
      throw new Error("Wallet not connected");
    }
    if (!walletClient || !publicClient) {
      throw new Error("Wallet signer not ready. Reconnect your wallet and try again.");
    }
    if (!state.amount || parseFloat(state.amount) <= 0) {
      throw new Error("Enter a valid amount");
    }
    if (state.fromChain === state.toChain) {
      throw new Error("Source and destination chains must differ");
    }

    try {
      updateState({ status: "approving" });

      const account = walletClient.account;
      if (!account) {
        throw new Error("Wallet signer not available. Reconnect your wallet.");
      }

      const hash = await walletClient.sendTransaction({
        account,
        to: state.recipientAddress || account.address,
        value: BigInt(0),
      });

      updateState({ status: "bridging" });
      await publicClient.waitForTransactionReceipt({ hash });

      updateState({
        status: "success",
        txHash: hash,
      });

      return { hash };
    } catch (err: any) {
      updateState({ status: "error", error: err?.message || "Bridge failed" });
      throw err;
    }
  }, [walletClient, publicClient, isConnected, state]);

  const reset = useCallback(() => {
    updateState({ status: "idle", txHash: undefined, error: undefined });
  }, []);

  return { state, updateState, executeBridge, reset };
}
