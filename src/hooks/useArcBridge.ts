"use client";

import { useCallback, useState } from "react";
import { isAddress, parseUnits, type Address } from "viem";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import type { BridgeState, TokenSymbol } from "@/types";
import { ARC_TESTNET_CHAIN_ID, ETHEREUM_SEPOLIA_CHAIN_ID, getAppKit, getArcKitKey, getAppKitResultHash, getViemAdapter, withCircleApiProxy } from "@/lib/arc-kit";
import { TOKEN_DECIMALS } from "@/lib/tokens";
import { promptWalletNetworkSwitch } from "@/lib/wallet-network";

const SEPOLIA_CHAIN_ID = ETHEREUM_SEPOLIA_CHAIN_ID;
const ARC_CHAIN_ID = ARC_TESTNET_CHAIN_ID;
export type BridgeProgressStep = "confirm" | "swap" | "bridge" | "receive";

function parseTokenAmount(value: string, decimals: number) {
  if (!value.trim()) return BigInt(0);
  try {
    return parseUnits(value, decimals);
  } catch {
    return null;
  }
}

function friendlyBridgeError(err: any, requiredNetwork = "the required source network") {
  const message = err?.shortMessage || err?.details || err?.message || "Bridge failed";

  if (/user rejected|rejected|denied/i.test(message)) return "Transaction rejected in wallet.";
  if (/insufficient|funds|balance/i.test(message)) return "Insufficient source token balance or gas for this route.";
  if (/chain|network/i.test(message)) return `Switch your wallet to ${requiredNetwork} and try again.`;
  if (/recipient|address/i.test(message)) return "Enter a valid recipient wallet address.";
  if (/key|api/i.test(message)) return "Arc App Kit setup is missing or Circle bridge API is unavailable.";

  return message;
}

export function useArcBridge() {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { address, chainId, isConnected } = useAccount();

  const [state, setState] = useState<BridgeState>({
    fromChain: "Ethereum_Sepolia",
    toChain: "Arc_Testnet",
    token: "USDC",
    amount: "",
    recipientAddress: "",
    status: "idle",
  });

  const updateState = useCallback((patch: Partial<BridgeState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  const token = state.token as TokenSymbol;
  const requiredChainId = state.fromChain === "Arc_Testnet" ? ARC_CHAIN_ID : SEPOLIA_CHAIN_ID;
  const currentChainId = chainId ?? publicClient?.chain?.id ?? requiredChainId;
  const appKitKey = getArcKitKey();
  const isSupportedPath = (token === "USDC" || token === "EURC") && (
    (state.fromChain === "Ethereum_Sepolia" && state.toChain === "Arc_Testnet") ||
    (state.fromChain === "Arc_Testnet" && state.toChain === "Ethereum_Sepolia")
  );
  const amount = parseTokenAmount(state.amount, TOKEN_DECIMALS[token]);
  const bridgeMode: "appkit" | "unsupported" = isSupportedPath ? "appkit" : "unsupported";
  const needsApproval = false;

  const approve = useCallback(async () => {
    throw new Error("Bridge approval is handled inside the Arc App Kit bridge confirmation.");
  }, []);

  const executeBridge = useCallback(async (onProgress?: (step: BridgeProgressStep) => void) => {
    if (!isConnected || !address) throw new Error("Wallet not connected");
    if (currentChainId !== requiredChainId) {
      throw new Error(`Switch your wallet to ${state.fromChain === "Arc_Testnet" ? "Arc Testnet" : "Ethereum Sepolia"} to bridge.`);
    }
    if (!walletClient || !publicClient) throw new Error("Wallet signer not ready. Reconnect your wallet and try again.");
    if (!state.amount || parseFloat(state.amount) <= 0 || !amount || amount <= BigInt(0)) throw new Error("Enter a valid amount.");
    if (!isSupportedPath) throw new Error("Bridge currently supports USDC and EURC routes between Ethereum Sepolia and Arc Testnet.");
    if (token === "EURC" && !appKitKey) {
      throw new Error("EURC bridge route needs NEXT_PUBLIC_ARC_KIT_KEY because it swaps EURC/USDC on Arc.");
    }

    const recipient = state.recipientAddress.trim();
    if (recipient && !isAddress(recipient)) throw new Error("Enter a valid recipient wallet address.");
    const toAddress = (recipient ? recipient : address) as Address;

    try {
      updateState({ status: "bridging", error: undefined });
      onProgress?.("confirm");
      const adapter = await getViemAdapter(walletClient, publicClient);
      const kit = await getAppKit();
      if (token === "EURC" && state.fromChain === "Arc_Testnet") {
        onProgress?.("swap");
        const swapResult = await withCircleApiProxy<any>(() =>
          kit.swap({
            from: { adapter, chain: "Arc_Testnet" },
            tokenIn: "EURC",
            tokenOut: "USDC",
            amountIn: state.amount,
            config: { kitKey: appKitKey, allowanceStrategy: "approve" },
          } as any)
        );
        const bridgeAmount = String(swapResult?.amountOut || swapResult?.estimatedOutput?.amount || state.amount);
        onProgress?.("bridge");
        const bridgeResult = await withCircleApiProxy<any>(() =>
          kit.bridge({
            from: { adapter, chain: "Arc_Testnet" },
            to: { adapter, chain: "Ethereum_Sepolia", recipientAddress: toAddress, useCircleRelayer: true },
            amount: bridgeAmount,
            token: "USDC",
          } as any)
        );
        const hash = getAppKitResultHash(bridgeResult) || getAppKitResultHash(swapResult);
        if (!hash) throw new Error("EURC swap and bridge submitted but no transaction hash was returned.");
        onProgress?.("receive");
        updateState({ status: "success", txHash: hash });
        return { hash, explorerBaseUrl: "https://testnet.arcscan.app/tx/" };
      }

      if (token === "EURC" && state.fromChain === "Ethereum_Sepolia") {
        onProgress?.("bridge");
        const bridgeResult = await withCircleApiProxy<any>(() =>
          kit.bridge({
            from: { adapter, chain: "Ethereum_Sepolia" },
            to: { adapter, chain: "Arc_Testnet", recipientAddress: toAddress, useCircleRelayer: true },
            amount: state.amount,
            token: "USDC",
          } as any)
        );
        const bridgeAmount = String(bridgeResult?.amount || state.amount);
        await promptWalletNetworkSwitch(ARC_CHAIN_ID).catch(() => undefined);
        onProgress?.("swap");
        const swapResult = await withCircleApiProxy<any>(() =>
          kit.swap({
            from: { adapter, chain: "Arc_Testnet" },
            tokenIn: "USDC",
            tokenOut: "EURC",
            amountIn: bridgeAmount,
            config: { kitKey: appKitKey, allowanceStrategy: "approve" },
          } as any)
        );
        const hash = getAppKitResultHash(swapResult) || getAppKitResultHash(bridgeResult);
        if (!hash) throw new Error("USDC bridge and EURC swap submitted but no transaction hash was returned.");
        onProgress?.("receive");
        updateState({ status: "success", txHash: hash });
        return { hash, explorerBaseUrl: "https://testnet.arcscan.app/tx/" };
      }

      onProgress?.("bridge");
      const result = await withCircleApiProxy<any>(() =>
        kit.bridge({
          from: { adapter, chain: state.fromChain },
          to: { adapter, chain: state.toChain, recipientAddress: toAddress, useCircleRelayer: true },
          amount: state.amount,
          token: "USDC",
        } as any)
      );
      const hash = getAppKitResultHash(result);

      if (!hash) {
        throw new Error("Bridge submitted but no transaction hash was returned.");
      }

      onProgress?.("receive");
      updateState({ status: "success", txHash: hash });
      return {
        hash,
        explorerBaseUrl: state.fromChain === "Arc_Testnet" ? "https://testnet.arcscan.app/tx/" : "https://sepolia.etherscan.io/tx/",
      };
    } catch (err: any) {
      const message = friendlyBridgeError(err, state.fromChain === "Arc_Testnet" ? "Arc Testnet" : "Ethereum Sepolia");
      updateState({ status: "error", error: message });
      throw new Error(message);
    }
  }, [address, amount, appKitKey, currentChainId, isConnected, isSupportedPath, publicClient, requiredChainId, state.amount, state.fromChain, state.recipientAddress, state.toChain, token, updateState, walletClient]);

  const reset = useCallback(() => {
    updateState({ status: "idle", txHash: undefined, error: undefined });
  }, [updateState]);

  return {
    state,
    updateState,
    executeBridge,
    approve,
    needsApproval,
    bridgeConfigured: isSupportedPath,
    bridgeReady: bridgeMode === "appkit",
    bridgeMode,
    requiredChainId,
    currentChainId,
    reset,
  };
}
