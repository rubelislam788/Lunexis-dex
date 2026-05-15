"use client";

import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TokenSymbol } from "@/types";
import { TOKEN_META } from "@/lib/tokens";
import TokenIcon from "@/components/ui/TokenIcon";

const TOKENS: TokenSymbol[] = ["ARC", "USDC", "EURC", "WETH"];
const TIMEFRAMES = ["1H", "24H", "7D", "30D", "1Y", "MAX"] as const;
type Timeframe = (typeof TIMEFRAMES)[number];

type TokenPriceMap = Partial<Record<TokenSymbol, number>>;

function fallbackPrice(symbol: TokenSymbol) {
  if (symbol === "USDC" || symbol === "EURC") return 1;
  if (symbol === "ARC") return 0.015;
  return 3000;
}

function pointsFor(symbol: TokenSymbol, timeframe: Timeframe, base: number) {
  const count = timeframe === "1H" ? 24 : timeframe === "24H" ? 30 : 42;
  const volatility = symbol === "USDC" || symbol === "EURC" ? 0.002 : symbol === "ARC" ? 0.08 : 0.035;
  const seed = symbol.charCodeAt(0) + timeframe.length * 17;
  return Array.from({ length: count }).map((_, index) => {
    const wave = Math.sin((index + seed) / 4) * volatility;
    const drift = (index / count - 0.5) * volatility * 1.7;
    const micro = Math.cos((index + seed) / 2.2) * volatility * 0.45;
    const price = Math.max(0.000001, base * (1 + wave + drift + micro));
    return {
      name: `${index + 1}`,
      price: Number(price.toFixed(price >= 1 ? 4 : 6)),
      volume: Math.round((price * (index + 11) * 4200) % 90000) + 12000,
    };
  });
}

export default function TokenPriceChart({ activeToken }: { activeToken: TokenSymbol }) {
  const [selectedToken, setSelectedToken] = useState<TokenSymbol>(activeToken);
  const [timeframe, setTimeframe] = useState<Timeframe>("24H");
  const [prices, setPrices] = useState<TokenPriceMap>({ USDC: 1, EURC: 1 });

  useEffect(() => setSelectedToken(activeToken), [activeToken]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/token-prices")
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (cancelled) return;
        setPrices({
          USDC: 1,
          EURC: Number(data?.prices?.EURC) || 1,
          WETH: Number(data?.prices?.WETH) || Number(data?.prices?.ETH) || undefined,
          ETH: Number(data?.prices?.ETH) || undefined,
          ARC: Number(data?.prices?.ARC) || undefined,
        });
      })
      .catch(() => null);
    const timer = window.setInterval(() => {
      fetch("/api/token-prices")
        .then((response) => response.ok ? response.json() : null)
        .then((data) => {
          if (cancelled || !data?.prices) return;
          setPrices((prev) => ({
            ...prev,
            EURC: Number(data.prices.EURC) || prev.EURC,
            WETH: Number(data.prices.WETH) || Number(data.prices.ETH) || prev.WETH,
            ETH: Number(data.prices.ETH) || prev.ETH,
            ARC: Number(data.prices.ARC) || prev.ARC,
          }));
        })
        .catch(() => null);
    }, 30000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const chart = useMemo(() => {
    const base = prices[selectedToken] || fallbackPrice(selectedToken);
    return pointsFor(selectedToken, timeframe, base);
  }, [prices, selectedToken, timeframe]);

  const first = chart[0]?.price ?? 0;
  const last = chart[chart.length - 1]?.price ?? 0;
  const change = first > 0 ? ((last - first) / first) * 100 : 0;
  const volume = chart.reduce((sum, item) => sum + item.volume, 0);

  return (
    <section className="lunexis-premium-card lunexis-price-chart">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div>
          <div className="lunexis-kicker">Advanced Token Charts</div>
          <h2>{selectedToken} Market Signal</h2>
        </div>
        <div className="lunexis-token-chart-tabs">
          {TOKENS.map((symbol) => (
            <button key={symbol} onClick={() => setSelectedToken(symbol)} className={selectedToken === symbol ? "is-active" : ""}>
              <TokenIcon symbol={symbol} size={22} />
              {symbol}
            </button>
          ))}
        </div>
      </div>
      <div className="lunexis-chart-summary">
        <div><span>Live price</span><strong>${last.toLocaleString(undefined, { maximumFractionDigits: last >= 1 ? 2 : 6 })}</strong></div>
        <div><span>Change</span><strong className={change >= 0 ? "is-up" : "is-down"}>{change >= 0 ? "+" : ""}{change.toFixed(2)}%</strong></div>
        <div><span>Volume</span><strong>${volume.toLocaleString()}</strong></div>
      </div>
      <div className="lunexis-timeframe-row">
        {TIMEFRAMES.map((item) => (
          <button key={item} onClick={() => setTimeframe(item)} className={timeframe === item ? "is-active" : ""}>{item}</button>
        ))}
      </div>
      <div className="lunexis-chart-canvas">
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={chart} margin={{ top: 10, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="lunexisChartGlow" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={TOKEN_META[selectedToken].accent} stopOpacity={0.55} />
                <stop offset="100%" stopColor={TOKEN_META[selectedToken].accent} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis dataKey="name" hide />
            <YAxis hide domain={["dataMin", "dataMax"]} />
            <Tooltip
              contentStyle={{ background: "rgba(0,0,0,0.82)", border: "1px solid rgba(56,189,248,0.32)", borderRadius: 16, color: "#f8fbff" }}
              formatter={(value, name) => [`$${Number(value).toLocaleString()}`, String(name)]}
            />
            <Area type="monotone" dataKey="price" stroke={TOKEN_META[selectedToken].accent} strokeWidth={3} fill="url(#lunexisChartGlow)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
