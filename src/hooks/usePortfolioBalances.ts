"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { erc20Abi, formatUnits, isAddressEqual, zeroAddress, type Address } from "viem";
import { useAccount, usePublicClient } from "wagmi";
import type { PortfolioBalance, TokenSymbol } from "@/types";
import { PORTFOLIO_TOKENS, TOKEN_CONTRACTS, TOKEN_DECIMALS, TOKEN_META } from "@/lib/tokens";

function emptyBalances(isLoading = false): PortfolioBalance[] {
  return PORTFOLIO_TOKENS.map((token) => ({
    token,
    amount: "0",
    value: token === "USDC" ? "$0.00" : token === "EURC" ? "EUR 0.00" : "Live",
    chain: TOKEN_META[token].chain,
    isLoading,
  }));
}

function cleanAmount(raw: bigint, decimals: number) {
  const formatted = formatUnits(raw, decimals);
  const [whole, fraction = ""] = formatted.split(".");
  const trimmedFraction = fraction.slice(0, decimals === 6 ? 4 : 6).replace(/0+$/, "");
  return trimmedFraction ? `${whole}.${trimmedFraction}` : whole;
}

function valueFor(token: TokenSymbol, amount: string) {
  const numeric = Number(amount || 0);
  if (token === "USDC") return `$${numeric.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  if (token === "EURC") return `EUR ${numeric.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  return "Live";
}

export function usePortfolioBalances(refreshMs = 12000) {
  const { address, isConnected, chain } = useAccount();
  const publicClient = usePublicClient();
  const [balances, setBalances] = useState<PortfolioBalance[]>(emptyBalances());
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("");
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (!isConnected || !address || !publicClient) {
      setBalances(emptyBalances());
      setLastUpdated("");
      return;
    }
    if (inFlight.current) return;

    inFlight.current = true;
    setIsLoading(true);
    setBalances((prev) => prev.length ? prev.map((item) => ({ ...item, isLoading: true })) : emptyBalances(true));

    try {
      const chainId = publicClient.chain?.id ?? chain?.id;
      const next = await Promise.all(PORTFOLIO_TOKENS.map(async (token) => {
        let raw = BigInt(0);
        if (token === "ETH") {
          raw = await publicClient.getBalance({ address });
        } else {
          const tokenAddress = TOKEN_CONTRACTS[token]?.[chainId ?? 0];
          if (tokenAddress && !isAddressEqual(tokenAddress, zeroAddress)) {
            raw = await publicClient.readContract({
              address: tokenAddress as Address,
              abi: erc20Abi,
              functionName: "balanceOf",
              args: [address],
            }) as bigint;
          }
        }

        const amount = cleanAmount(raw, TOKEN_DECIMALS[token]);
        return {
          token,
          amount,
          value: valueFor(token, amount),
          chain: chain?.name ?? TOKEN_META[token].chain,
          isLoading: false,
        };
      }));

      setBalances(next);
      setLastUpdated(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    } catch {
      setBalances((prev) => prev.map((item) => ({ ...item, isLoading: false })));
    } finally {
      inFlight.current = false;
      setIsLoading(false);
    }
  }, [address, chain?.id, chain?.name, isConnected, publicClient]);

  useEffect(() => {
    refresh();
    if (!isConnected) return;
    const timer = window.setInterval(refresh, refreshMs);
    return () => window.clearInterval(timer);
  }, [isConnected, refresh, refreshMs]);

  return { balances, isLoading, lastUpdated, refresh };
}
