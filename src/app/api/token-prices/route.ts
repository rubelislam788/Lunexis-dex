import { NextResponse } from "next/server";
import type { TokenSymbol } from "@/types";

type TokenPriceMap = Partial<Record<TokenSymbol, number>>;

async function getEthPrice() {
  const response = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd", {
    next: { revalidate: 60 },
  }).catch(() => null);
  if (!response?.ok) return undefined;
  const data = await response.json().catch(() => null);
  const price = Number(data?.ethereum?.usd);
  return Number.isFinite(price) && price > 0 ? price : undefined;
}

async function getEurUsdPrice() {
  const response = await fetch("https://api.frankfurter.app/latest?from=EUR&to=USD", {
    next: { revalidate: 60 },
  }).catch(() => null);
  if (!response?.ok) return undefined;
  const data = await response.json().catch(() => null);
  const price = Number(data?.rates?.USD);
  return Number.isFinite(price) && price > 0 ? price : undefined;
}

export async function GET() {
  const [ethUsd, eurUsd] = await Promise.all([getEthPrice(), getEurUsdPrice()]);
  const prices: TokenPriceMap = {
    USDC: 1,
    EURC: eurUsd ?? 1,
    ETH: ethUsd,
    WETH: ethUsd,
  };

  return NextResponse.json({
    prices,
    updatedAt: new Date().toISOString(),
  });
}
