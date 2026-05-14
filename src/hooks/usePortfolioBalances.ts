"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPublicClient, erc20Abi, fallback, formatUnits, http, isAddressEqual, zeroAddress, type Address, type PublicClient } from "viem";
import { sepolia } from "viem/chains";
import { useAccount } from "wagmi";
import type { PortfolioBalance, TokenSymbol } from "@/types";
import { arcChain } from "@/lib/wagmi";
import { ARC_TESTNET_CHAIN_ID, ARC_TESTNET_RPC_URL, ETHEREUM_SEPOLIA_CHAIN_ID, ETHEREUM_SEPOLIA_RPC_URLS, normalizeRpcUrl } from "@/lib/arc-kit";
import { PORTFOLIO_TOKENS, TOKEN_CONTRACTS, TOKEN_DECIMALS, TOKEN_META } from "@/lib/tokens";

const ARC_CHAIN_ID = ARC_TESTNET_CHAIN_ID;
const SEPOLIA_CHAIN_ID = ETHEREUM_SEPOLIA_CHAIN_ID;

const chainClients: Record<number, PublicClient> = {
  [ARC_CHAIN_ID]: createPublicClient({
    chain: arcChain,
    transport: http(normalizeRpcUrl(ARC_TESTNET_RPC_URL)),
  }),
  [SEPOLIA_CHAIN_ID]: createPublicClient({
    chain: sepolia,
    transport: fallback(ETHEREUM_SEPOLIA_RPC_URLS.map((url) => http(normalizeRpcUrl(url)))),
  }),
};

const tokenChains: Record<TokenSymbol, number> = {
  ETH: SEPOLIA_CHAIN_ID,
  ARC: ARC_CHAIN_ID,
  USDC: ARC_CHAIN_ID,
  EURC: ARC_CHAIN_ID,
  WETH: ARC_CHAIN_ID,
};

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

async function readTokenBalance(address: Address, token: TokenSymbol) {
  const chainId = tokenChains[token];
  const client = chainClients[chainId];

  if (!client) return BigInt(0);

  if (token === "ETH") {
    return client.getBalance({ address });
  }

  const tokenAddress = TOKEN_CONTRACTS[token]?.[chainId];
  if (!tokenAddress || isAddressEqual(tokenAddress, zeroAddress)) {
    return BigInt(0);
  }

  return client.readContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address],
  }) as Promise<bigint>;
}

export function usePortfolioBalances(refreshMs = 12000) {
  const { address, isConnected } = useAccount();
  const [balances, setBalances] = useState<PortfolioBalance[]>(emptyBalances());
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("");
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (!isConnected || !address) {
      setBalances(emptyBalances());
      setLastUpdated("");
      return;
    }
    if (inFlight.current) return;

    inFlight.current = true;
    setIsLoading(true);
    setBalances((prev) => prev.length ? prev.map((item) => ({ ...item, isLoading: true })) : emptyBalances(true));

    try {
      const next = await Promise.all(PORTFOLIO_TOKENS.map(async (token) => {
        try {
          const raw = await readTokenBalance(address, token);
          const amount = cleanAmount(raw, TOKEN_DECIMALS[token]);

          return {
            token,
            amount,
            value: valueFor(token, amount),
            chain: TOKEN_META[token].chain,
            isLoading: false,
          };
        } catch {
          return {
            token,
            amount: "0",
            value: valueFor(token, "0"),
            chain: TOKEN_META[token].chain,
            isLoading: false,
          };
        }
      }));

      setBalances(next);
      setLastUpdated(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    } finally {
      inFlight.current = false;
      setIsLoading(false);
    }
  }, [address, isConnected]);

  useEffect(() => {
    refresh();
    if (!isConnected) return;
    const timer = window.setInterval(refresh, refreshMs);
    return () => window.clearInterval(timer);
  }, [isConnected, refresh, refreshMs]);

  return { balances, isLoading, lastUpdated, refresh };
}
