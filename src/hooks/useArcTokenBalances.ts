"use client";

import { useMemo } from "react";
import { formatUnits } from "viem";
import { useAccount, useBalance, useReadContracts } from "wagmi";
import { ARC_SWAP_TOKENS, ERC20_ABI, type ArcSwapToken } from "@/lib/arc-dex";

export function useArcTokenBalances(tokens: ArcSwapToken[] = ARC_SWAP_TOKENS) {
  const { address, isConnected } = useAccount();
  const { data: nativeBalance } = useBalance({ address, query: { enabled: Boolean(address) } });

  const erc20Tokens = tokens.filter((token) => !token.isNative && token.address);

  const { data, isLoading, refetch } = useReadContracts({
    allowFailure: true,
    contracts: address
      ? erc20Tokens.map((token) => ({
          address: token.address!,
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: [address],
        }))
      : [],
    query: { enabled: Boolean(address) && isConnected },
  });

  const balances = useMemo(() => {
    return tokens.map((token) => {
      if (token.isNative) {
        return {
          ...token,
          formatted: nativeBalance ? Number(nativeBalance.formatted).toFixed(4) : "0.0000",
        };
      }

      const index = erc20Tokens.findIndex((item) => item.symbol === token.symbol);
      const value = index >= 0 ? data?.[index]?.result : undefined;
      const formatted = typeof value === "bigint" ? Number(formatUnits(value, token.decimals)).toFixed(4) : "0.0000";

      return {
        ...token,
        formatted,
      };
    });
  }, [tokens, nativeBalance, erc20Tokens, data]);

  return {
    balances,
    isLoading,
    refreshBalances: refetch,
  };
}
