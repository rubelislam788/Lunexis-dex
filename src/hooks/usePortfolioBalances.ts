"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPublicClient, erc20Abi, fallback, formatUnits, http, isAddressEqual, zeroAddress, type Address, type PublicClient } from "viem";
import { useAccount } from "wagmi";
import type { PortfolioBalance, TokenSymbol } from "@/types";
import { arcChain, ethereumSepoliaChain } from "@/lib/wagmi";
import { ARC_TESTNET_CHAIN_ID, ETHEREUM_SEPOLIA_CHAIN_ID, ETHEREUM_SEPOLIA_RPC_URLS, createArcFallbackTransport, normalizeRpcUrl } from "@/lib/arc-kit";
import { PORTFOLIO_TOKENS, TOKEN_CONTRACTS, TOKEN_DECIMALS } from "@/lib/tokens";

const ARC_CHAIN_ID = ARC_TESTNET_CHAIN_ID;
const SEPOLIA_CHAIN_ID = ETHEREUM_SEPOLIA_CHAIN_ID;

const chainClients: Record<number, PublicClient> = {
  [ARC_CHAIN_ID]: createPublicClient({
    chain: arcChain,
    transport: createArcFallbackTransport(true),
  }),
  [SEPOLIA_CHAIN_ID]: createPublicClient({
    chain: ethereumSepoliaChain,
    transport: fallback(ETHEREUM_SEPOLIA_RPC_URLS.map((url) => http(normalizeRpcUrl(url), { retryCount: 2, timeout: 10000 })), {
      rank: true,
      retryCount: 2,
    }),
  }),
};

type TokenPriceMap = Partial<Record<TokenSymbol, number>>;

function chainLabel(chainId: number) {
  return chainId === SEPOLIA_CHAIN_ID ? "Ethereum Sepolia" : "Arc Testnet";
}

function balanceChainId(chainId?: number) {
  return chainId === SEPOLIA_CHAIN_ID ? SEPOLIA_CHAIN_ID : ARC_CHAIN_ID;
}

function emptyBalances(isLoading = false, chainId = ARC_CHAIN_ID): PortfolioBalance[] {
  return PORTFOLIO_TOKENS.map((token) => ({
    token,
    amount: "0",
    displayAmount: `0.00 ${token}`,
    value: "$0.00",
    unitPrice: "Price syncing",
    chain: chainLabel(chainId),
    isLoading,
  }));
}

function cleanAmount(raw: bigint, decimals: number) {
  const formatted = formatUnits(raw, decimals);
  const [whole, fraction = ""] = formatted.split(".");
  const maxFractionDigits = decimals <= 6 ? 4 : 6;
  const trimmedFraction = fraction.slice(0, maxFractionDigits).replace(/0+$/, "");
  return trimmedFraction ? `${whole}.${trimmedFraction}` : whole;
}

function displayAmountFor(token: TokenSymbol, amount: string) {
  const numeric = Number(amount || 0);
  const maximumFractionDigits = numeric >= 1000 ? 2 : numeric >= 1 ? 4 : 6;
  const formatted = numeric.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits,
  });

  return `${formatted} ${token}`;
}

function formatUsd(value: number) {
  if (!Number.isFinite(value)) return "Price unavailable";
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: value >= 1 ? 2 : 4,
    maximumFractionDigits: value >= 1 ? 2 : 6,
  })}`;
}

function valueFor(token: TokenSymbol, amount: string, prices: TokenPriceMap) {
  const numeric = Number(amount || 0);
  const price = prices[token];
  if (!Number.isFinite(price)) return token === "ARC" ? "Price unavailable" : "$0.00";
  return formatUsd(numeric * Number(price));
}

function unitPriceFor(token: TokenSymbol, prices: TokenPriceMap) {
  const price = prices[token];
  if (!Number.isFinite(price)) return token === "ARC" ? "No market price" : "Price syncing";
  return `${formatUsd(Number(price))} / ${token}`;
}

async function fetchTokenPrices(): Promise<TokenPriceMap> {
  const response = await fetch("/api/token-prices").catch(() => null);
  if (!response?.ok) {
    return { USDC: 1, EURC: 1 };
  }
  const data = await response.json().catch(() => null);
  return {
    USDC: 1,
    EURC: Number(data?.prices?.EURC) || 1,
    ETH: Number(data?.prices?.ETH) || undefined,
    WETH: Number(data?.prices?.WETH) || undefined,
    ARC: Number(data?.prices?.ARC) || undefined,
  };
}

async function readTokenBalance(address: Address, token: TokenSymbol, requestedChainId = ARC_CHAIN_ID) {
  const chainId = balanceChainId(requestedChainId);
  const client = chainClients[chainId];

  if (!client) return { raw: BigInt(0), decimals: TOKEN_DECIMALS[token] };

  if (token === "ETH") {
    const raw = await client.getBalance({ address });
    return { raw, decimals: 18 };
  }

  const tokenAddress = TOKEN_CONTRACTS[token]?.[chainId];
  if (!tokenAddress || isAddressEqual(tokenAddress, zeroAddress)) {
    return { raw: BigInt(0), decimals: TOKEN_DECIMALS[token] };
  }

  const [raw, decimals] = await Promise.all([
    client.readContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [address],
    }) as Promise<bigint>,
    client.readContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: "decimals",
    }).catch(() => TOKEN_DECIMALS[token]) as Promise<number>,
  ]);

  return { raw, decimals: Number(decimals) };
}

export function usePortfolioBalances(refreshMs = 12000, chainId = ARC_CHAIN_ID) {
  const { address, isConnected } = useAccount();
  const requestedChainId = balanceChainId(chainId);
  const [balances, setBalances] = useState<PortfolioBalance[]>(emptyBalances(false, requestedChainId));
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("");
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (!isConnected || !address) {
      setBalances(emptyBalances(false, requestedChainId));
      setLastUpdated("");
      return;
    }
    if (inFlight.current) return;

    inFlight.current = true;
    setIsLoading(true);
    setBalances((prev) => prev.length ? prev.map((item) => ({ ...item, chain: chainLabel(requestedChainId), isLoading: true })) : emptyBalances(true, requestedChainId));

    try {
      const prices = await fetchTokenPrices();
      const next = await Promise.all(PORTFOLIO_TOKENS.map(async (token) => {
        try {
          const { raw, decimals } = await readTokenBalance(address, token, requestedChainId);
          const amount = cleanAmount(raw, decimals);

          return {
            token,
            amount,
            displayAmount: displayAmountFor(token, amount),
            value: valueFor(token, amount, prices),
            unitPrice: unitPriceFor(token, prices),
            chain: chainLabel(requestedChainId),
            isLoading: false,
          };
        } catch {
          return {
            token,
            amount: "0",
            displayAmount: displayAmountFor(token, "0"),
            value: valueFor(token, "0", prices),
            unitPrice: unitPriceFor(token, prices),
            chain: chainLabel(requestedChainId),
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
  }, [address, isConnected, requestedChainId]);

  useEffect(() => {
    refresh();
    if (!isConnected) return;
    const timer = window.setInterval(refresh, refreshMs);
    const refreshWhenOnline = () => refresh();
    window.addEventListener("online", refreshWhenOnline);
    window.addEventListener("focus", refreshWhenOnline);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("online", refreshWhenOnline);
      window.removeEventListener("focus", refreshWhenOnline);
    };
  }, [isConnected, refresh, refreshMs]);

  return { balances, isLoading, lastUpdated, refresh };
}
