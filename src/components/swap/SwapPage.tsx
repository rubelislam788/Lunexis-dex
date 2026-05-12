// src/components/swap/SwapPage.tsx
"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useArcSwap } from "@/hooks/useArcSwap";
import { useToast } from "@/components/ui/Toast";
import { SUPPORTED_CHAINS, SUPPORTED_TOKENS, CHAIN_META } from "@/lib/arc-kit";

const TOKEN_LIST = [
  { sym: "USDC", name: "USD Coin", color: "#2775CA", logo: "💵" },
  { sym: "EURC", name: "Euro Coin", color: "#3B82F6", logo: "💶" },
];

export default function SwapPage() {
  const { isConnected } = useAccount();
  const { state, updateState, executeSwap, reset } = useArcSwap();
  const { show, ToastContainer } = useToast();
  const [showTokenModal, setShowTokenModal] = useState<"from" | "to" | null>(null);

  const handleSwap = async () => {
    if (!isConnected) {
      show("Please connect your wallet first", "error");
      return;
    }
    try {
      await executeSwap();
      show(`✓ Swapped ${state.amountIn} ${state.fromToken} → ${state.toToken}`, "success");
    } catch (err: any) {
      show(err.message || "Swap failed", "error");
    }
  };

  const flipTokens = () => {
    updateState({ fromToken: state.toToken, toToken: state.fromToken });
  };

  const isLoading = state.status === "approving" || state.status === "swapping";
  const isSuccess = state.status === "success";

  return (
    <div
      className="min-h-screen pt-16"
      style={{ background: "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(0,180,200,0.06) 0%, transparent 70%), #131314" }}
    >
      <ToastContainer />

      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Page header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-3" style={{ background: "rgba(0,220,229,0.08)", border: "1px solid rgba(0,220,229,0.2)" }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#00dce5" }} />
            <span style={{ fontFamily: "'Space Grotesk'", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "#00dce5" }}>
              POWERED BY CIRCLE ARC APP KIT
            </span>
          </div>
          <h1 style={{ fontFamily: "'Space Grotesk'", fontSize: 36, fontWeight: 900, letterSpacing: "-0.02em", color: "#e9feff", marginBottom: 8 }}>
            Token Swap
          </h1>
          <p style={{ color: "#849495", fontSize: 16 }}>
            Swap USDC and EURC on Arc Testnet via Circle's App Kit SDK.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* === SWAP CARD === */}
          <div className="lg:col-span-3">
            <div
              className="rounded-2xl p-6"
              style={{ background: "#0e0e0f", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              {/* Chain selector */}
              <div className="mb-4">
                <label style={{ fontFamily: "'Space Grotesk'", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "#555", textTransform: "uppercase" }}>
                  Network
                </label>
                <select
                  value={state.fromChain}
                  onChange={(e) => updateState({ fromChain: e.target.value })}
                  className="mt-1 w-full px-3 py-2 rounded-lg"
                  style={{ fontFamily: "'Space Grotesk'", fontSize: 13 }}
                >
                  {Object.entries(SUPPORTED_CHAINS).map(([key, val]) => (
                    <option key={key} value={val}>{CHAIN_META[val]?.label ?? val}</option>
                  ))}
                </select>
              </div>

              {/* From token */}
              <div className="mb-2">
                <label style={{ fontFamily: "'Space Grotesk'", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "#555", textTransform: "uppercase" }}>
                  You Pay
                </label>
                <div
                  className="mt-1 flex items-center gap-3 px-4 py-4 rounded-xl"
                  style={{ background: "#000", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <input
                    type="number"
                    value={state.amountIn}
                    onChange={(e) => updateState({ amountIn: e.target.value })}
                    placeholder="0.00"
                    className="flex-1 text-2xl bg-transparent border-none outline-none"
                    style={{ fontFamily: "'Space Grotesk'", fontWeight: 700, color: "#e5e2e3" }}
                    min="0"
                    step="any"
                  />
                  <button
                    onClick={() => setShowTokenModal("from")}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg"
                    style={{ background: "rgba(0,220,229,0.1)", border: "1px solid rgba(0,220,229,0.25)" }}
                  >
                    <span style={{ fontSize: 18 }}>{TOKEN_LIST.find(t => t.sym === state.fromToken)?.logo}</span>
                    <span style={{ fontFamily: "'Space Grotesk'", fontSize: 14, fontWeight: 700, color: "#00dce5" }}>{state.fromToken}</span>
                    <span style={{ color: "#555" }}>▾</span>
                  </button>
                </div>
              </div>

              {/* Flip button */}
              <div className="flex justify-center my-2">
                <button
                  onClick={flipTokens}
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-all"
                  style={{
                    background: "rgba(0,220,229,0.1)",
                    border: "1px solid rgba(0,220,229,0.25)",
                    color: "#00dce5",
                    fontSize: 18,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,220,229,0.2)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(0,220,229,0.1)")}
                >
                  ⇅
                </button>
              </div>

              {/* To token */}
              <div className="mb-6">
                <label style={{ fontFamily: "'Space Grotesk'", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "#555", textTransform: "uppercase" }}>
                  You Receive (est.)
                </label>
                <div
                  className="mt-1 flex items-center gap-3 px-4 py-4 rounded-xl"
                  style={{ background: "#000", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <div
                    className="flex-1 text-2xl"
                    style={{ fontFamily: "'Space Grotesk'", fontWeight: 700, color: "#849495" }}
                  >
                    {state.amountIn ? `≈ ${state.amountIn}` : "0.00"}
                  </div>
                  <button
                    onClick={() => setShowTokenModal("to")}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg"
                    style={{ background: "rgba(182,0,248,0.1)", border: "1px solid rgba(182,0,248,0.25)" }}
                  >
                    <span style={{ fontSize: 18 }}>{TOKEN_LIST.find(t => t.sym === state.toToken)?.logo}</span>
                    <span style={{ fontFamily: "'Space Grotesk'", fontSize: 14, fontWeight: 700, color: "#ebb2ff" }}>{state.toToken}</span>
                    <span style={{ color: "#555" }}>▾</span>
                  </button>
                </div>
              </div>

              {/* Slippage */}
              <div
                className="rounded-xl p-4 mb-6"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div className="flex justify-between items-center mb-2">
                  <span style={{ fontFamily: "'Space Grotesk'", fontSize: 11, color: "#555" }}>Slippage Tolerance</span>
                  <div className="flex gap-2">
                    {["auto", "0.5%", "1%"].map((s) => (
                      <button
                        key={s}
                        onClick={() => updateState({ slippage: s })}
                        style={{
                          fontFamily: "'Space Grotesk'",
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 4,
                          background: state.slippage === s ? "rgba(0,220,229,0.15)" : "rgba(255,255,255,0.04)",
                          border: `1px solid ${state.slippage === s ? "rgba(0,220,229,0.4)" : "rgba(255,255,255,0.1)"}`,
                          color: state.slippage === s ? "#00dce5" : "#849495",
                          cursor: "pointer",
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex justify-between">
                  <span style={{ fontFamily: "'Space Grotesk'", fontSize: 11, color: "#555" }}>Price Impact</span>
                  <span style={{ fontFamily: "'Space Grotesk'", fontSize: 11, color: "#22c55e" }}>{"< 0.1%"}</span>
                </div>
              </div>

              {/* Arc App Kit info badge */}
              <div
                className="rounded-xl p-3 mb-6 flex items-center gap-3"
                style={{ background: "rgba(0,220,229,0.04)", border: "1px solid rgba(0,220,229,0.15)" }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(0,220,229,0.15)" }}
                >
                  <span style={{ fontSize: 16 }}>⬡</span>
                </div>
                <div>
                  <div style={{ fontFamily: "'Space Grotesk'", fontSize: 10, fontWeight: 700, color: "#00dce5", letterSpacing: "0.08em" }}>
                    CIRCLE ARC APP KIT
                  </div>
                  <div style={{ fontSize: 11, color: "#555" }}>
                    Powered by Circle's unified swap SDK · No routing complexity
                  </div>
                </div>
              </div>

              {/* CTA */}
              {isSuccess ? (
                <div className="text-center">
                  <div
                    className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                    style={{ background: "rgba(0,220,229,0.12)", border: "2px solid #00dce5", boxShadow: "0 0 28px rgba(0,220,229,0.3)" }}
                  >
                    <span style={{ fontSize: 32, color: "#00dce5" }}>✓</span>
                  </div>
                  <div style={{ fontFamily: "'Space Grotesk'", fontSize: 20, fontWeight: 700, color: "#00dce5", marginBottom: 4 }}>
                    Swap Complete!
                  </div>
                  {state.txHash && (
                    <a
                      href={`https://scan.arc.io/tx/${state.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontFamily: "'Space Grotesk'", fontSize: 11, color: "#555", textDecoration: "underline" }}
                    >
                      View on ArcScan →
                    </a>
                  )}
                  <button
                    onClick={reset}
                    className="btn-outline-cyan w-full py-3 rounded-lg mt-4"
                    style={{ fontSize: 12 }}
                  >
                    Swap Again
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleSwap}
                  disabled={isLoading || !state.amountIn}
                  className="btn-primary w-full py-4 rounded-xl glow-cyan"
                  style={{ fontSize: 13 }}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-3">
                      <span className="spinner w-5 h-5 inline-block" />
                      {state.status === "approving" ? "Approving…" : "Swapping…"}
                    </span>
                  ) : (
                    isConnected ? "Confirm Swap" : "Connect Wallet to Swap"
                  )}
                </button>
              )}

              {state.error && (
                <p className="mt-3 text-center" style={{ color: "#ffb4ab", fontSize: 12 }}>
                  {state.error}
                </p>
              )}
            </div>
          </div>

          {/* === SIDE INFO === */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            {/* How it works */}
            <div className="rounded-2xl p-5" style={{ background: "#0e0e0f", border: "1px solid rgba(255,255,255,0.08)" }}>
              <h3 style={{ fontFamily: "'Space Grotesk'", fontSize: 14, fontWeight: 700, color: "#e5e2e3", marginBottom: 16 }}>
                How Swap Works
              </h3>
              {[
                { n: "01", title: "Connect Wallet", desc: "MetaMask or WalletConnect on Arc Testnet" },
                { n: "02", title: "Select Tokens", desc: "Choose USDC or EURC to swap on-chain" },
                { n: "03", title: "Arc App Kit Routes", desc: "Circle SDK handles liquidity & routing automatically" },
                { n: "04", title: "Sign & Confirm", desc: "Approve in wallet — tokens arrive in seconds" },
              ].map(({ n, title, desc }) => (
                <div key={n} className="flex gap-3 mb-4 last:mb-0">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: "rgba(0,220,229,0.1)", border: "1px solid rgba(0,220,229,0.3)" }}
                  >
                    <span style={{ fontFamily: "'Space Grotesk'", fontSize: 9, fontWeight: 700, color: "#00dce5" }}>{n}</span>
                  </div>
                  <div>
                    <div style={{ fontFamily: "'Space Grotesk'", fontSize: 12, fontWeight: 700, color: "#e5e2e3", marginBottom: 2 }}>{title}</div>
                    <div style={{ fontSize: 11, color: "#555", lineHeight: 1.5 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* SDK snippet */}
            <div className="rounded-2xl p-5" style={{ background: "#0e0e0f", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="flex items-center justify-between mb-3">
                <h3 style={{ fontFamily: "'Space Grotesk'", fontSize: 12, fontWeight: 700, color: "#849495" }}>SDK CALL</h3>
                <span style={{ fontFamily: "'Space Grotesk'", fontSize: 9, color: "#555", letterSpacing: "0.1em" }}>@circle-fin/app-kit</span>
              </div>
              <pre
                className="rounded-lg p-4 text-xs overflow-auto"
                style={{
                  background: "#000",
                  border: "1px solid rgba(0,220,229,0.1)",
                  color: "#00dce5",
                  fontFamily: "'Space Grotesk', monospace",
                  lineHeight: 1.7,
                }}
              >
{`await kit.swap({
  from: {
    adapter: viemAdapter,
    chain: "${state.fromChain}",
  },
  tokenIn: "${state.fromToken}",
  tokenOut: "${state.toToken}",
  amountIn: "${state.amountIn || "1.00"}",
  config: { kitKey },
});`}
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* Token modal */}
      {showTokenModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
          onClick={() => setShowTokenModal(null)}
        >
          <div
            className="rounded-2xl p-6 w-80"
            style={{ background: "#1c1b1c", border: "1px solid rgba(255,255,255,0.12)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontFamily: "'Space Grotesk'", fontSize: 16, fontWeight: 700, color: "#e5e2e3", marginBottom: 16 }}>
              Select Token
            </h3>
            {TOKEN_LIST.map((token) => (
              <button
                key={token.sym}
                onClick={() => {
                  if (showTokenModal === "from") {
                    const newFrom = token.sym;
                    if (newFrom === state.toToken) {
                      updateState({ fromToken: newFrom, toToken: state.fromToken });
                    } else {
                      updateState({ fromToken: newFrom });
                    }
                  } else {
                    const newTo = token.sym;
                    if (newTo === state.fromToken) {
                      updateState({ toToken: newTo, fromToken: state.toToken });
                    } else {
                      updateState({ toToken: newTo });
                    }
                  }
                  setShowTokenModal(null);
                }}
                className="w-full flex items-center gap-4 p-4 rounded-xl mb-2 transition-all"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  cursor: "pointer",
                  textAlign: "left",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(0,220,229,0.3)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)")}
              >
                <span style={{ fontSize: 28 }}>{token.logo}</span>
                <div>
                  <div style={{ fontFamily: "'Space Grotesk'", fontSize: 14, fontWeight: 700, color: "#e5e2e3" }}>{token.sym}</div>
                  <div style={{ fontSize: 11, color: "#555" }}>{token.name}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
