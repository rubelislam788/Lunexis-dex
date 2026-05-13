// src/components/swap/SwapPage.tsx
"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useArcSwap } from "@/hooks/useArcSwap";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/components/ui/Toast";
import { ARC_FAUCET_URL } from "@/lib/constants";
import { createActivity } from "@/lib/profile";
import { SWAP_TOKENS, TOKEN_META } from "@/lib/tokens";
import type { TokenSymbol } from "@/types";
import TokenIcon from "@/components/ui/TokenIcon";

export default function SwapPage() {
  const { isConnected } = useAccount();
  const { state, updateState, executeSwap, reset } = useArcSwap();
  const { profile, pushActivity } = useProfile();
  const { show, ToastContainer } = useToast();
  const [selector, setSelector] = useState<"from" | "to" | null>(null);

  const fromToken = TOKEN_META[state.fromToken as TokenSymbol] ?? TOKEN_META.USDC;
  const toToken = TOKEN_META[state.toToken as TokenSymbol] ?? TOKEN_META.EURC;

  const handleSwap = async () => {
    if (!isConnected) {
      show("Please connect your wallet first", "error");
      return;
    }
    try {
      await executeSwap();
      pushActivity(createActivity("swap", "Token swap", `${state.amountIn} ${state.fromToken} swapped to ${state.toToken}.`, state.fromToken as TokenSymbol));
      show(`Swapped ${state.amountIn} ${state.fromToken} to ${state.toToken}`, "success");
    } catch (err: any) {
      show(err.message || "Swap failed", "error");
    }
  };

  const pickToken = (symbol: TokenSymbol) => {
    if (selector === "from") {
      updateState(symbol === state.toToken ? { fromToken: symbol, toToken: state.fromToken } : { fromToken: symbol });
    } else {
      updateState(symbol === state.fromToken ? { toToken: symbol, fromToken: state.toToken } : { toToken: symbol });
    }
    setSelector(null);
  };

  const isLoading = state.status === "approving" || state.status === "swapping";

  return (
    <div className="min-h-screen pt-16 arc-page-shell">
      <ToastContainer />
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-10">
        <div className="flex items-start justify-between gap-6 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-3" style={{ background: "rgba(56,189,248,0.08)", border: "1px solid rgba(56,189,248,0.22)" }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#38bdf8" }} />
              <span style={{ fontFamily: "'Space Grotesk'", fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", color: "#38bdf8" }}>
                ARC SWAP TERMINAL
              </span>
            </div>
            <h1 style={{ fontFamily: "'Space Grotesk'", fontSize: 40, fontWeight: 900, color: "#f8fbff" }}>Token Swap</h1>
            <p style={{ color: "#849495", fontSize: 16 }}>Swap USDC, EURC, and WETH with exact uploaded token logos.</p>
          </div>
          <a href={ARC_FAUCET_URL} target="_blank" rel="noreferrer" className="btn-outline-cyan px-5 py-3 rounded-xl text-xs">Open Faucet</a>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <section className="lg:col-span-3 arc-card rounded-3xl p-6">
            <TokenAmountPanel label="You Pay" token={fromToken.symbol} amount={state.amountIn} onAmount={(amount) => updateState({ amountIn: amount })} onToken={() => setSelector("from")} />
            <div className="flex justify-center my-4">
              <button
                onClick={() => updateState({ fromToken: state.toToken, toToken: state.fromToken })}
                className="w-12 h-12 rounded-full transition-all"
                style={{ background: "linear-gradient(135deg,#38bdf8,#ff2db2)", boxShadow: "0 0 28px rgba(56,189,248,0.34)", color: "white", fontSize: 22 }}
              >
                ⇅
              </button>
            </div>
            <TokenAmountPanel label="You Receive" token={toToken.symbol} amount={state.amountIn ? `≈ ${state.amountIn}` : ""} readOnly onToken={() => setSelector("to")} />

            <div className="grid grid-cols-3 gap-3 my-6">
              {["auto", "0.5%", "1%"].map((slippage) => (
                <button key={slippage} onClick={() => updateState({ slippage })} className="rounded-xl py-3" style={{ background: state.slippage === slippage ? "rgba(56,189,248,0.16)" : "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: state.slippage === slippage ? "#38bdf8" : "#849495", fontFamily: "'Space Grotesk'", fontSize: 12, fontWeight: 800 }}>
                  {slippage}
                </button>
              ))}
            </div>

            <div className="flex justify-between rounded-2xl p-4 mb-6" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <span style={{ color: "#849495" }}>Price Impact</span>
              <span style={{ color: "#22c55e", fontFamily: "'Space Grotesk'", fontWeight: 800 }}>{"< 0.1%"}</span>
            </div>

            <button onClick={handleSwap} disabled={isLoading || !state.amountIn} className="btn-primary w-full py-4 rounded-2xl">
              {isLoading ? "Swapping..." : isConnected ? "Confirm Swap" : "Connect Wallet to Swap"}
            </button>
            {state.status === "success" && (
              <button onClick={reset} className="btn-ghost w-full py-3 rounded-2xl mt-3">Swap Again</button>
            )}
          </section>

          <aside className="lg:col-span-2 flex flex-col gap-4">
            <div className="arc-card rounded-3xl p-5">
              <h3 style={{ fontFamily: "'Space Grotesk'", fontSize: 16, fontWeight: 900, color: "#f8fbff", marginBottom: 14 }}>Portfolio Balances</h3>
              <div className="grid gap-2">
                {(profile?.balances.filter((item) => SWAP_TOKENS.includes(item.token)) ?? []).map((item) => (
                  <div key={item.token} className="flex items-center justify-between rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="flex items-center gap-2"><TokenIcon symbol={item.token} size={32} /><span style={{ color: "#f8fbff", fontFamily: "'Space Grotesk'", fontWeight: 800 }}>{item.token}</span></div>
                    <span style={{ color: "#849495" }}>{item.amount}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="arc-card rounded-3xl p-5">
              <h3 style={{ fontFamily: "'Space Grotesk'", fontSize: 16, fontWeight: 900, color: "#f8fbff", marginBottom: 12 }}>Swap Route</h3>
              <p style={{ color: "#849495", fontSize: 13, lineHeight: 1.6 }}>Animated ARC route preview with live balance context, slippage controls, and token selector motion.</p>
            </div>
          </aside>
        </div>
      </div>

      {selector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(10px)" }} onClick={() => setSelector(null)}>
          <div className="arc-card rounded-3xl p-6 w-96" onClick={(event) => event.stopPropagation()}>
            <h3 style={{ fontFamily: "'Space Grotesk'", fontSize: 18, fontWeight: 900, color: "#f8fbff", marginBottom: 16 }}>Select Token</h3>
            {SWAP_TOKENS.map((symbol) => {
              const token = TOKEN_META[symbol];
              return (
                <button key={symbol} onClick={() => pickToken(symbol)} className="w-full flex items-center gap-4 p-4 rounded-2xl mb-2" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${token.accent}44` }}>
                  <TokenIcon symbol={symbol} size={44} />
                  <div className="text-left">
                    <div style={{ fontFamily: "'Space Grotesk'", color: "#f8fbff", fontWeight: 900 }}>{symbol}</div>
                    <div style={{ color: "#849495", fontSize: 12 }}>{token.label}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function TokenAmountPanel({ label, token, amount, readOnly, onAmount, onToken }: { label: string; token: TokenSymbol; amount: string; readOnly?: boolean; onAmount?: (amount: string) => void; onToken: () => void }) {
  return (
    <div className="rounded-3xl p-5" style={{ background: "rgba(0,0,0,0.32)", border: `1px solid ${TOKEN_META[token].accent}44` }}>
      <div style={{ fontFamily: "'Space Grotesk'", fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", color: "#849495", textTransform: "uppercase", marginBottom: 10 }}>{label}</div>
      <div className="flex items-center gap-4">
        <input
          type={readOnly ? "text" : "number"}
          value={amount}
          readOnly={readOnly}
          onChange={(event) => onAmount?.(event.target.value)}
          placeholder="0.00"
          className="flex-1 bg-transparent border-none outline-none"
          style={{ fontFamily: "'Space Grotesk'", fontSize: 32, fontWeight: 900, color: "#f8fbff" }}
        />
        <button onClick={onToken} className="flex items-center gap-2 px-4 py-3 rounded-2xl" style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${TOKEN_META[token].accent}66` }}>
          <TokenIcon symbol={token} size={34} />
          <span style={{ fontFamily: "'Space Grotesk'", fontWeight: 900, color: "#f8fbff" }}>{token}</span>
        </button>
      </div>
    </div>
  );
}
